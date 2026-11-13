import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OnProgressParameters,
  PDFDocumentLoadingTask,
  PDFDocumentProxy
} from 'pdfjs-dist';
import { AN_SIGN, HeritageFrieze } from '@/components/heritage';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { normalizeSearchText } from '@/lib/arabic-search';
import type { Book } from '@/types/book';
import { PdfPageView } from './pdf-reader/PdfPageView';
import { PdfReaderSidebar } from './pdf-reader/PdfReaderSidebar';
import { PdfReaderToolbar } from './pdf-reader/PdfReaderToolbar';
import {
  clampPageNumber,
  computePageScale,
  countNormalizedTextMatches,
  getSpreadForPage,
  loadPdfJs,
  PDFJS_CMAP_URL,
  PDFJS_STANDARD_FONT_URL,
  resolvePdfOutline,
  resolveSafePdfUrl,
  stepZoom,
  type PdfLayoutMode,
  type PdfOutlineNode,
  type PdfPaperMode,
  type PdfSearchHit,
  type PdfSidebarTab,
  type PdfZoomMode
} from './pdf-reader/pdf-engine';

export interface PdfReaderDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (book: Book) => void;
  baseHref?: string;
}

interface PdfReaderSessionProps {
  book: Book;
  safeUrl: string | null;
  onClose: () => void;
  onDownload?: (book: Book) => void;
}

function PdfReaderSession({ book, safeUrl, onClose, onDownload }: PdfReaderSessionProps) {
  const { lang, dir, isRTL, translate, getBookField, formatNumber } = useI18n();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const textCacheRef = useRef<Map<number, string>>(new Map());
  const programmaticScrollRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(() =>
    safeUrl ? 'loading' : 'error'
  );
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const [outline, setOutline] = useState<PdfOutlineNode[]>([]);
  const [basePageSize, setBasePageSize] = useState<{
    width: number;
    height: number;
  }>({ width: 595, height: 842 });
  const [pageDimensions, setPageDimensions] = useState<
    Record<number, { width: number; height: number }>
  >({});

  const [zoom, setZoom] = useState<PdfZoomMode>('fit-width');
  const [layoutMode, setLayoutMode] = useState<PdfLayoutMode>('continuous');
  const [paperMode, setPaperMode] = useState<PdfPaperMode>('original');
  const [rotation, setRotation] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [sidebarTab, setSidebarTab] = useState<PdfSidebarTab>('thumbnails');

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{
    query: string;
    hits: PdfSearchHit[];
  }>({ query: '', hits: [] });
  const [currentHitIndex, setCurrentHitIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  const nativeFullscreenSupported = useMemo(() => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
      return false;
    }
    const doc = document as Document & { webkitFullscreenEnabled?: boolean };
    const enabled = Boolean(document.fullscreenEnabled ?? doc.webkitFullscreenEnabled);
    const proto = HTMLElement.prototype as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    return Boolean(enabled && (proto.requestFullscreen || proto.webkitRequestFullscreen));
  }, []);

  const expandedView = isFullscreen || theaterMode;

  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({
    width: 860,
    height: 640
  });

  const handleDialogEscape = useCallback(() => {
    if (theaterMode) {
      setTheaterMode(false);
      return;
    }
    onClose();
  }, [onClose, theaterMode]);

  const dialogRef = useAccessibleDialog<HTMLDivElement>({
    open: true,
    onEscape: handleDialogEscape,
    initialFocusRef: closeBtnRef
  });

  // Track stage viewport dimensions with ResizeObserver for accurate Fit Width / Fit Page
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    const updateSize = () => {
      const rect = stageEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, [sidebarOpen, searchOpen, expandedView]);

  // Sync native fullscreen status (standard + WebKit prefixed)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);

  // Load PDF document on mount or manual retry
  useEffect(() => {
    if (!safeUrl) {
      return;
    }

    const targetUrl = safeUrl;
    let cancelled = false;
    let activeDoc: PDFDocumentProxy | null = null;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    const textCache = textCacheRef.current;

    async function loadDocument() {
      const pdfjs = await loadPdfJs();
      if (cancelled) return;

      const task = pdfjs.getDocument({
        url: targetUrl,
        cMapUrl: PDFJS_CMAP_URL,
        cMapPacked: true,
        standardFontDataUrl: PDFJS_STANDARD_FONT_URL
      });
      loadingTask = task;
      task.onProgress = ({ loaded, total }: OnProgressParameters) => {
        if (cancelled) return;
        if (total && total > 0) {
          setLoadProgress(Math.min(100, Math.round((loaded / total) * 100)));
        }
      };

      const doc = await task.promise;
      if (cancelled) {
        void doc.destroy?.();
        return;
      }
      activeDoc = doc;

      let firstSize = { width: 595, height: 842 };
      try {
        const firstPage = await doc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1 });
        firstSize = { width: vp.width, height: vp.height };
        firstPage.cleanup();
      } catch {
        // Fallback to A4 proportions if page 1 inspection fails
      }

      const resolvedOutline = await resolvePdfOutline(doc);
      if (cancelled) return;

      setBasePageSize(firstSize);
      setOutline(resolvedOutline);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      setPdfDoc(doc);
      setStatus('ready');
    }

    loadDocument().catch(() => {
      if (cancelled) return;
      setPdfDoc(null);
      setTotalPages(0);
      setStatus('error');
    });

    return () => {
      cancelled = true;
      textCache.clear();
      if (loadingTask?.destroy) {
        try {
          void loadingTask.destroy();
        } catch {
          // Ignore teardown errors
        }
      }
      if (activeDoc?.destroy) {
        try {
          void activeDoc.destroy();
        } catch {
          // Ignore teardown errors
        }
      }
    };
  }, [safeUrl, retryNonce]);

  const effectiveBaseSize = useMemo(() => {
    const activeKnown = pageDimensions[currentPage];
    if (activeKnown) return activeKnown;
    return rotation % 180 === 0
      ? basePageSize
      : { width: basePageSize.height, height: basePageSize.width };
  }, [pageDimensions, currentPage, rotation, basePageSize]);

  const activeSpread = useMemo(
    () =>
      layoutMode === 'book' && totalPages > 0
        ? getSpreadForPage(totalPages, currentPage)
        : [currentPage],
    [layoutMode, totalPages, currentPage]
  );

  const effectiveScale = useMemo(
    () =>
      computePageScale({
        zoom,
        baseWidth: effectiveBaseSize.width,
        baseHeight: effectiveBaseSize.height,
        stageWidth: stageSize.width,
        stageHeight: stageSize.height,
        layoutMode,
        isSpreadPair: layoutMode === 'book' && activeSpread.length > 1
      }),
    [zoom, effectiveBaseSize, stageSize, layoutMode, activeSpread.length]
  );

  const handlePageDimensions = useCallback(
    (pageNumber: number, width: number, height: number) => {
      setPageDimensions((prev) => {
        const existing = prev[pageNumber];
        if (
          existing &&
          Math.abs(existing.width - width) < 0.5 &&
          Math.abs(existing.height - height) < 0.5
        ) {
          return prev;
        }
        return { ...prev, [pageNumber]: { width, height } };
      });
    },
    []
  );

  const jumpToPage = useCallback(
    (targetPage: number) => {
      if (totalPages <= 0) return;
      const clamped = clampPageNumber(targetPage, totalPages);
      setCurrentPage(clamped);

      if (layoutMode === 'continuous') {
        programmaticScrollRef.current = true;
        requestAnimationFrame(() => {
          const el = pageRefs.current.get(clamped);
          if (el?.scrollIntoView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          setTimeout(() => {
            programmaticScrollRef.current = false;
          }, 380);
        });
      } else if (stageRef.current) {
        stageRef.current.scrollTop = 0;
      }
    },
    [totalPages, layoutMode]
  );

  const handlePrevPage = useCallback(() => {
    if (totalPages <= 0) return;
    if (layoutMode === 'book') {
      const spreadStart = activeSpread[0] ?? currentPage;
      if (spreadStart <= 1) return;
      const target = spreadStart === 2 ? 1 : spreadStart - 2;
      jumpToPage(target);
      return;
    }
    jumpToPage(currentPage - 1);
  }, [totalPages, layoutMode, activeSpread, currentPage, jumpToPage]);

  const handleNextPage = useCallback(() => {
    if (totalPages <= 0) return;
    if (layoutMode === 'book') {
      const spreadEnd = activeSpread[activeSpread.length - 1] ?? currentPage;
      if (spreadEnd >= totalPages) return;
      jumpToPage(spreadEnd + 1);
      return;
    }
    jumpToPage(currentPage + 1);
  }, [totalPages, layoutMode, activeSpread, currentPage, jumpToPage]);

  // Continuous-scroll active page synchronization
  useEffect(() => {
    if (status !== 'ready' || layoutMode !== 'continuous') return;
    const stageEl = stageRef.current;
    if (!stageEl) return;

    let rafId = 0;
    const syncActivePage = () => {
      rafId = 0;
      if (programmaticScrollRef.current) return;
      const stageRect = stageEl.getBoundingClientRect();
      const targetY = stageRect.top + stageRect.height * 0.32;
      let bestPage = currentPageRef.current;
      let bestDistance = Number.POSITIVE_INFINITY;

      pageRefs.current.forEach((node, pageNum) => {
        const rect = node.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - targetY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPage = pageNum;
        }
      });

      if (bestPage !== currentPageRef.current) {
        setCurrentPage(bestPage);
      }
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(syncActivePage);
    };

    stageEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      stageEl.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [status, layoutMode]);

  // Full-document normalized Arabic/English search
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchText(searchQuery, lang),
    [searchQuery, lang]
  );

  useEffect(() => {
    if (!pdfDoc || status !== 'ready' || !normalizedSearchQuery) {
      return;
    }

    let cancelled = false;
    const activeDoc = pdfDoc;
    const targetQuery = normalizedSearchQuery;

    const timer = setTimeout(async () => {
      const hits: PdfSearchHit[] = [];
      for (let pageNum = 1; pageNum <= activeDoc.numPages; pageNum += 1) {
        if (cancelled) return;
        let pageText = textCacheRef.current.get(pageNum);
        if (pageText === undefined) {
          try {
            const page = await activeDoc.getPage(pageNum);
            const content = await page.getTextContent();
            pageText = content.items
              .map((item) =>
                'str' in item && typeof item.str === 'string' ? item.str : ''
              )
              .join(' ');
            textCacheRef.current.set(pageNum, pageText);
            page.cleanup();
          } catch {
            pageText = '';
          }
        }
        const count = countNormalizedTextMatches(pageText, targetQuery, lang);
        if (count > 0) {
          hits.push({ pageNumber: pageNum, count });
        }
      }

      if (cancelled) return;
      setSearchResult({ query: targetQuery, hits });

      if (hits.length > 0) {
        const nearestIdx = hits.findIndex((h) => h.pageNumber >= currentPageRef.current);
        const startIdx = nearestIdx >= 0 ? nearestIdx : 0;
        setCurrentHitIndex(startIdx);
        jumpToPage(hits[startIdx].pageNumber);
      } else {
        setCurrentHitIndex(0);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pdfDoc, status, normalizedSearchQuery, lang, jumpToPage]);

  const searchHits = useMemo(
    () =>
      normalizedSearchQuery && searchResult.query === normalizedSearchQuery
        ? searchResult.hits
        : [],
    [normalizedSearchQuery, searchResult]
  );

  const isSearching = Boolean(
    pdfDoc &&
    status === 'ready' &&
    normalizedSearchQuery &&
    searchResult.query !== normalizedSearchQuery
  );

  const handleSearchStep = useCallback(
    (direction: 'prev' | 'next') => {
      if (searchHits.length === 0) return;
      const nextIndex =
        direction === 'next'
          ? (currentHitIndex + 1) % searchHits.length
          : (currentHitIndex - 1 + searchHits.length) % searchHits.length;
      setCurrentHitIndex(nextIndex);
      jumpToPage(searchHits[nextIndex].pageNumber);
    },
    [searchHits, currentHitIndex, jumpToPage]
  );

  const openAndFocusSearch = useCallback(() => {
    setSearchOpen(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const target = dialogRef.current as
      (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!target || typeof document === 'undefined') return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };

    const currentFs = document.fullscreenElement || doc.webkitFullscreenElement;
    if (currentFs) {
      const exitFn = document.exitFullscreen ?? doc.webkitExitFullscreen;
      if (typeof exitFn === 'function') {
        void Promise.resolve(exitFn.call(document)).catch(() => {});
      }
      setTheaterMode(false);
      return;
    }

    if (theaterMode) {
      setTheaterMode(false);
      return;
    }

    if (!nativeFullscreenSupported) {
      setTheaterMode(true);
      return;
    }

    const requestFn = target.requestFullscreen ?? target.webkitRequestFullscreen;
    if (typeof requestFn !== 'function') {
      setTheaterMode(true);
      return;
    }

    try {
      const result = requestFn.call(target);
      if (result && typeof (result as Promise<void>).catch === 'function') {
        void (result as Promise<void>).catch(() => {
          setTheaterMode(true);
        });
      }
    } catch {
      setTheaterMode(true);
    }
  }, [dialogRef, nativeFullscreenSupported, theaterMode]);

  // Reader keyboard shortcuts
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openAndFocusSearch();
        return;
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }
      if (status !== 'ready') return;

      if (event.key === 'PageDown') {
        event.preventDefault();
        handleNextPage();
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        handlePrevPage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isRTL) handlePrevPage();
        else handleNextPage();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (isRTL) handleNextPage();
        else handlePrevPage();
      } else if (event.key === 'Home') {
        event.preventDefault();
        jumpToPage(1);
      } else if (event.key === 'End') {
        event.preventDefault();
        jumpToPage(totalPages);
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setZoom(stepZoom(effectiveScale, 'in'));
      } else if (event.key === '-') {
        event.preventDefault();
        setZoom(stepZoom(effectiveScale, 'out'));
      } else if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [
    status,
    isRTL,
    totalPages,
    effectiveScale,
    handleNextPage,
    handlePrevPage,
    jumpToPage,
    openAndFocusSearch
  ]);

  const bookTitle = getBookField(book, 'title') || translate('عارض الملف', 'PDF Reader');

  const pageNumbersToRender =
    layoutMode === 'continuous'
      ? Array.from({ length: totalPages }, (_, idx) => idx + 1)
      : activeSpread;

  const totalMatchCount = searchHits.reduce((acc, hit) => acc + hit.count, 0);
  const activeSearchPage = searchHits[currentHitIndex]?.pageNumber ?? null;

  return (
    <div
      data-testid="pdf-reader-dialog"
      className="hx-dialog-backdrop hx-pdf-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-reader-title"
      dir={dir}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`hx-panel hx-dialog-panel hx-pdf-panel${expandedView ? ' hx-pdf-panel--fullscreen' : ''}`}
        tabIndex={-1}
      >
        <HeritageFrieze />

        <PdfReaderToolbar
          book={book}
          title={bookTitle}
          safeUrl={safeUrl}
          status={status}
          totalPages={totalPages}
          currentPage={currentPage}
          zoom={zoom}
          effectiveScale={effectiveScale}
          layoutMode={layoutMode}
          paperMode={paperMode}
          sidebarOpen={sidebarOpen}
          searchOpen={searchOpen}
          isFullscreen={expandedView}
          fullscreenSupported={nativeFullscreenSupported}
          rotation={rotation}
          searchQuery={searchQuery}
          isSearching={isSearching}
          totalMatches={totalMatchCount > 0 ? searchHits.length : 0}
          currentHitPosition={searchHits.length > 0 ? currentHitIndex + 1 : 0}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onToggleSearch={() => {
            if (searchOpen) {
              setSearchOpen(false);
            } else {
              openAndFocusSearch();
            }
          }}
          onLayoutChange={(mode) => {
            setLayoutMode(mode);
            if (stageRef.current) stageRef.current.scrollTop = 0;
          }}
          onPaperModeChange={setPaperMode}
          onPrevPage={handlePrevPage}
          onNextPage={handleNextPage}
          onJumpToPage={jumpToPage}
          onZoomOut={() => setZoom(stepZoom(effectiveScale, 'out'))}
          onZoomIn={() => setZoom(stepZoom(effectiveScale, 'in'))}
          onZoomSelect={setZoom}
          onRotate={() => setRotation((prev) => (prev + 90) % 360)}
          onDownload={onDownload}
          onToggleFullscreen={handleToggleFullscreen}
          onClose={onClose}
          onSearchQueryChange={setSearchQuery}
          onSearchStep={handleSearchStep}
          onCloseSearch={() => {
            setSearchOpen(false);
            setSearchQuery('');
          }}
          searchInputRef={searchInputRef}
          closeBtnRef={closeBtnRef}
        />

        <div className="hx-pdf-workspace">
          <PdfReaderSidebar
            open={sidebarOpen}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
            onCloseMobile={() => setSidebarOpen(false)}
            pdfDoc={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            outline={outline}
            book={book}
            onSelectPage={(pageNum) => {
              jumpToPage(pageNum);
              if (typeof window !== 'undefined' && window.innerWidth <= 960) {
                setSidebarOpen(false);
              }
            }}
          />

          <div
            ref={stageRef}
            data-testid="pdf-reader-stage"
            data-paper-mode={paperMode}
            className={`hx-pdf-stage hx-pdf-stage--${layoutMode}`}
          >
            {status === 'loading' && (
              <div
                className="hx-pdf-state-overlay"
                data-testid="pdf-reader-loading"
                role="status"
                aria-live="polite"
              >
                <div className="hx-pdf-loader-card">
                  <div className="hx-pdf-loader-emblem" aria-hidden="true">
                    {AN_SIGN}
                  </div>
                  <h3 className="m-0 mb-1.5 text-base font-bold">
                    {translate('جارٍ تهيئة مخطوطة PDF…', 'Preparing PDF manuscript…')}
                  </h3>
                  <p className="m-0 text-xs opacity-75">
                    {loadProgress !== null
                      ? translate(
                          `تم تحميل ${formatNumber(loadProgress)}% من المستند`,
                          `Loaded ${loadProgress}% of document`
                        )
                      : translate(
                          'يتم الآن استدعاء صفحات المرجع بدقة عالية',
                          'Rendering crisp archival pages inside your browser'
                        )}
                  </p>
                  <div className="hx-pdf-loader-bar" aria-hidden="true">
                    <div
                      className={`hx-pdf-loader-bar-fill${loadProgress === null ? ' is-indeterminate' : ''}`}
                      style={
                        loadProgress !== null ? { width: `${loadProgress}%` } : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="hx-pdf-state-overlay">
                <div
                  data-testid="pdf-reader-error"
                  className="hx-state-card hx-state-card--error hx-pdf-error-card max-w-md w-full"
                  role="alert"
                >
                  <span className="hx-state-seal" aria-hidden="true">
                    {AN_SIGN}
                  </span>
                  <h3 className="font-bold text-base mb-1">
                    {translate(
                      'تعذّر فتح المستند داخل القارئ',
                      'Unable to open PDF in the viewer'
                    )}
                  </h3>
                  <p className="text-sm text-[var(--hx-ink-2)] mb-4">
                    {translate(
                      'تحقّق من الاتصال بالإنترنت أو افتح الملف مباشرة أو حمّله على جهازك.',
                      'Check your connection, retry loading, or open the file directly.'
                    )}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {safeUrl && (
                      <button
                        data-testid="pdf-reader-retry"
                        type="button"
                        className="hx-pdf-tool-btn is-active hx-pdf-action-btn"
                        onClick={() => {
                          setStatus('loading');
                          setLoadProgress(null);
                          setRetryNonce((n) => n + 1);
                        }}
                      >
                        {translate('إعادة المحاولة', 'Retry')}
                      </button>
                    )}
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hx-pdf-tool-btn hx-pdf-action-btn"
                      >
                        {translate('فتح مباشر', 'Open original')}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {status === 'ready' && pdfDoc && (
              <div className="hx-pdf-pages">
                {layoutMode === 'book' ? (
                  <div
                    className={`hx-pdf-spread${activeSpread.length > 1 ? ' hx-pdf-spread--book' : ''}`}
                    dir={dir}
                  >
                    {pageNumbersToRender.map((pageNum) => (
                      <PdfPageView
                        key={`${pageNum}-${rotation}`}
                        pdfDoc={pdfDoc}
                        pageNumber={pageNum}
                        scale={effectiveScale}
                        rotation={rotation}
                        paperMode={paperMode}
                        searchQuery={normalizedSearchQuery}
                        isActivePage={pageNum === currentPage}
                        isCurrentSearchHit={pageNum === activeSearchPage}
                        lang={lang}
                        knownBaseSize={pageDimensions[pageNum] ?? effectiveBaseSize}
                        onPageDimensions={handlePageDimensions}
                        onActivate={setCurrentPage}
                        pageRef={(node) => {
                          if (node) pageRefs.current.set(pageNum, node);
                          else pageRefs.current.delete(pageNum);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  pageNumbersToRender.map((pageNum) => (
                    <PdfPageView
                      key={`${pageNum}-${rotation}`}
                      pdfDoc={pdfDoc}
                      pageNumber={pageNum}
                      scale={effectiveScale}
                      rotation={rotation}
                      paperMode={paperMode}
                      searchQuery={normalizedSearchQuery}
                      isActivePage={pageNum === currentPage}
                      isCurrentSearchHit={pageNum === activeSearchPage}
                      lang={lang}
                      lazy={layoutMode === 'continuous' && totalPages > 3}
                      knownBaseSize={pageDimensions[pageNum] ?? effectiveBaseSize}
                      onPageDimensions={handlePageDimensions}
                      onActivate={setCurrentPage}
                      pageRef={(node) => {
                        if (node) pageRefs.current.set(pageNum, node);
                        else pageRefs.current.delete(pageNum);
                      }}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hx-pdf-statusbar">
          <span aria-hidden="true" className="text-[var(--hx-gold,#b8872d)]">
            {AN_SIGN}
          </span>
          <input
            data-testid="pdf-reader-scrubber"
            type="range"
            className="hx-pdf-scrubber"
            min={1}
            max={Math.max(1, totalPages)}
            value={Math.min(currentPage, Math.max(1, totalPages))}
            disabled={status !== 'ready' || totalPages <= 1}
            onChange={(e) => jumpToPage(Number.parseInt(e.target.value, 10))}
            aria-label={translate('شريط تمرير الصفحات', 'Page scrubber')}
          />
          <span className="hx-pdf-status-readout">
            {Math.round(effectiveScale * 100)}%
            {totalPages > 0
              ? ` · ${translate(
                  `صفحة ${formatNumber(currentPage)} من ${formatNumber(totalPages)}`,
                  `Page ${formatNumber(currentPage)} of ${formatNumber(totalPages)}`
                )}`
              : ''}
          </span>
          <span className="hx-pdf-status-hints">
            <kbd className="hx-kbd">Ctrl+F</kbd>
            <span>{translate('بحث', 'Find')}</span>
            <kbd className="hx-kbd">R</kbd>
            <span>{translate('تدوير', 'Rotate')}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function PdfReaderDialog({
  book,
  open,
  onOpenChange,
  onDownload,
  baseHref
}: PdfReaderDialogProps) {
  const isDialogOpen = open && book !== null;

  const safeUrl = useMemo(
    () => (isDialogOpen && book ? resolveSafePdfUrl(book.file_path, baseHref) : null),
    [isDialogOpen, book, baseHref]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!isDialogOpen || !book) {
    return null;
  }

  return (
    <PdfReaderSession
      key={`${book.id}:${safeUrl ?? 'invalid'}`}
      book={book}
      safeUrl={safeUrl}
      onClose={handleClose}
      onDownload={onDownload}
    />
  );
}
