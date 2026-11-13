import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { AN_SIGN, HeritageIcon } from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import type { Book } from '@/types/book';
import {
  ZOOM_PRESETS,
  ZOOM_STEPS,
  type PdfLayoutMode,
  type PdfPaperMode,
  type PdfZoomMode
} from './pdf-engine';

export interface PdfReaderToolbarProps {
  book: Book | null;
  title: string;
  safeUrl: string | null;
  status: 'loading' | 'ready' | 'error';
  totalPages: number;
  currentPage: number;
  zoom: PdfZoomMode;
  effectiveScale: number;
  layoutMode: PdfLayoutMode;
  paperMode: PdfPaperMode;
  sidebarOpen: boolean;
  searchOpen: boolean;
  isFullscreen: boolean;
  fullscreenSupported?: boolean;
  rotation?: number;
  searchQuery: string;
  isSearching: boolean;
  totalMatches: number;
  currentHitPosition: number;
  onToggleSidebar: () => void;
  onToggleSearch: () => void;
  onLayoutChange: (mode: PdfLayoutMode) => void;
  onPaperModeChange: (mode: PdfPaperMode) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onJumpToPage: (page: number) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onZoomSelect: (zoom: PdfZoomMode) => void;
  onRotate: () => void;
  onDownload?: (book: Book) => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
  onSearchQueryChange: (query: string) => void;
  onSearchStep: (direction: 'prev' | 'next') => void;
  onCloseSearch: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  closeBtnRef: RefObject<HTMLButtonElement | null>;
}

function SvgIcon({
  children,
  className = 'hx-pdf-icon'
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function PdfReaderToolbar({
  book,
  title,
  safeUrl,
  status,
  totalPages,
  currentPage,
  zoom,
  effectiveScale,
  layoutMode,
  paperMode,
  sidebarOpen,
  searchOpen,
  isFullscreen,
  fullscreenSupported = true,
  rotation = 0,
  searchQuery,
  isSearching,
  totalMatches,
  currentHitPosition,
  onToggleSidebar,
  onToggleSearch,
  onLayoutChange,
  onPaperModeChange,
  onPrevPage,
  onNextPage,
  onJumpToPage,
  onZoomOut,
  onZoomIn,
  onZoomSelect,
  onRotate,
  onDownload,
  onToggleFullscreen,
  onClose,
  onSearchQueryChange,
  onSearchStep,
  onCloseSearch,
  searchInputRef,
  closeBtnRef
}: PdfReaderToolbarProps) {
  const { translate, getBookField, formatNumber } = useI18n();
  const [draftPageInput, setDraftPageInput] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const overflowMenuRef = useRef<HTMLDivElement | null>(null);
  const searchToggleRef = useRef<HTMLButtonElement | null>(null);

  const displayedPageInput = draftPageInput ?? String(currentPage);

  // Manage Overflow Menu dismissal (capture-phase Escape, outside click, desktop resize)
  useEffect(() => {
    if (!overflowOpen || typeof document === 'undefined') return;

    const rafId = requestAnimationFrame(() => {
      const candidates = overflowMenuRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], select:not([disabled])'
      );
      if (!candidates) return;
      for (const el of candidates) {
        if (window.getComputedStyle(el).display !== 'none') {
          el.focus();
          break;
        }
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOverflowOpen(false);
        requestAnimationFrame(() => {
          moreBtnRef.current?.focus();
        });
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (
        targetNode &&
        !overflowMenuRef.current?.contains(targetNode) &&
        !moreBtnRef.current?.contains(targetNode)
      ) {
        setOverflowOpen(false);
      }
    };

    const mql =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(min-width: 1024px)')
        : null;
    const onMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOverflowOpen(false);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown);
    mql?.addEventListener?.('change', onMediaChange);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown);
      mql?.removeEventListener?.('change', onMediaChange);
    };
  }, [overflowOpen]);

  const commitPageDraft = (raw: string) => {
    const parsed = Number.parseInt(raw.trim(), 10);
    setDraftPageInput(null);
    if (Number.isFinite(parsed)) {
      onJumpToPage(parsed);
    }
  };

  const handlePageSubmit = (e: FormEvent) => {
    e.preventDefault();
    commitPageDraft(displayedPageInput);
  };

  const handleZoomSelectChange = (val: string) => {
    if (val === 'fit-width' || val === 'fit-page') {
      onZoomSelect(val);
      return;
    }
    const parsed = Number.parseFloat(val);
    if (Number.isFinite(parsed)) {
      onZoomSelect(parsed);
    }
  };

  const closeSearchAndRestoreFocus = () => {
    onCloseSearch();
    requestAnimationFrame(() => {
      searchToggleRef.current?.focus();
    });
  };

  const authorText = book ? getBookField(book, 'author') : '';
  const displayYear = book?.year && book.year !== '0' ? book.year : '';
  const displayPages =
    totalPages > 0
      ? totalPages
      : book?.pages && book.pages !== '0'
        ? Number(book.pages)
        : 0;
  const progressPercent =
    totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  const zoomSelectValue =
    typeof zoom === 'number'
      ? ZOOM_PRESETS.some((p) => Math.abs(p - zoom) < 0.005)
        ? String(ZOOM_PRESETS.find((p) => Math.abs(p - zoom) < 0.005))
        : '__custom__'
      : zoom;

  const customPercentLabel = `${Math.round(effectiveScale * 100)}%`;

  const minZoomScale = ZOOM_STEPS[0] ?? 0.4;
  const maxZoomScale = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? 3;
  const canZoomOut = status === 'ready' && effectiveScale > minZoomScale + 0.03;
  const canZoomIn = status === 'ready' && effectiveScale < maxZoomScale - 0.03;

  const fullscreenLabel = fullscreenSupported
    ? translate(
        isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة',
        isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
      )
    : translate(
        isFullscreen ? 'تصغير القارئ' : 'توسيع القارئ',
        isFullscreen ? 'Exit expanded view' : 'Expand reader'
      );

  const rotateApplied = rotation % 360 !== 0;

  const paperModes: { id: PdfPaperMode; ar: string; en: string }[] = [
    { id: 'original', ar: 'أصلي', en: 'Original' },
    { id: 'parchment', ar: 'رقّ', en: 'Parchment' },
    { id: 'night', ar: 'ليلي', en: 'Night' }
  ];

  const layoutModes: { id: PdfLayoutMode; ar: string; en: string }[] = [
    { id: 'continuous', ar: 'متصل', en: 'Scroll' },
    { id: 'single', ar: 'صفحة', en: 'Single' },
    { id: 'book', ar: 'كتاب', en: 'Book' }
  ];

  return (
    <>
      {/* Top Heritage Lapis Masthead */}
      <div className="hx-pdf-masthead">
        <div className="hx-pdf-masthead-start">
          <div className="hx-pdf-seal" aria-hidden="true">
            {AN_SIGN}
          </div>
          <div className="hx-pdf-title-group">
            <h2
              id="pdf-reader-title"
              data-testid="pdf-reader-title"
              className="hx-pdf-title"
            >
              {title}
            </h2>
            <div className="hx-pdf-meta">
              {authorText && <span className="hx-pdf-meta-chip">{authorText}</span>}
              {displayYear && (
                <span className="hx-pdf-meta-chip" dir="ltr">
                  {displayYear}
                </span>
              )}
              {displayPages > 0 && (
                <span className="hx-pdf-meta-chip">
                  {formatNumber(displayPages)} {translate('صفحة', 'pages')}
                </span>
              )}
              {book?.file_size && (
                <span className="hx-pdf-meta-chip" dir="ltr">
                  {book.file_size}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hx-pdf-masthead-actions">
          {/* Paper Reading Mode Switch (hidden <768px via CSS; mirrored inside Overflow Menu) */}
          <div
            className="hx-pdf-paper-switch hx-pdf-hide-mobile"
            role="group"
            aria-label={translate('نمط ورقة القراءة', 'Paper reading filter')}
            data-testid="pdf-reader-paper"
          >
            {paperModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`hx-pdf-paper-btn${paperMode === mode.id ? ' is-active' : ''}`}
                aria-pressed={paperMode === mode.id}
                aria-label={translate(mode.ar, mode.en)}
                onClick={() => onPaperModeChange(mode.id)}
                title={translate(mode.ar, mode.en)}
              >
                <span
                  className={`hx-pdf-swatch hx-pdf-swatch--${mode.id}`}
                  aria-hidden="true"
                />
                <span className="hx-pdf-paper-label">{translate(mode.ar, mode.en)}</span>
              </button>
            ))}
          </div>

          {/* Direct Download */}
          {book && onDownload ? (
            <button
              type="button"
              className="hx-pdf-header-btn"
              onClick={() => onDownload(book)}
              aria-label={translate('تحميل نسخة PDF', 'Download PDF')}
              title={translate('تحميل نسخة PDF', 'Download PDF')}
            >
              <HeritageIcon name="download" size={18} className="hx-pdf-icon" />
              <span className="hx-pdf-btn-label">{translate('تحميل', 'Download')}</span>
            </button>
          ) : safeUrl ? (
            <a
              href={safeUrl}
              download={book?.file_name || undefined}
              className="hx-pdf-header-btn"
              aria-label={translate('تحميل نسخة PDF', 'Download PDF')}
              title={translate('تحميل نسخة PDF', 'Download PDF')}
            >
              <HeritageIcon name="download" size={18} className="hx-pdf-icon" />
              <span className="hx-pdf-btn-label">{translate('تحميل', 'Download')}</span>
            </a>
          ) : null}

          {/* Fullscreen / Theater Expand (>=480px inline, <480px inside Overflow Menu) */}
          <button
            type="button"
            className={`hx-pdf-header-btn hx-pdf-header-btn--icon hx-pdf-from-mobile-lg${isFullscreen ? ' is-active' : ''}`}
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={fullscreenLabel}
            title={fullscreenLabel}
          >
            <SvgIcon>
              {isFullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              )}
            </SvgIcon>
          </button>

          {/* Direct External URL (>=1024px inline, <1024px inside Overflow Menu) */}
          {safeUrl && (
            <a
              data-testid="pdf-reader-direct-link"
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hx-pdf-header-btn hx-pdf-from-desktop"
              aria-label={translate(
                'فتح الملف مباشرة في نافذة جديدة',
                'Open original PDF in new tab'
              )}
              title={translate('فتح الملف مباشرة في نافذة جديدة', 'Open original PDF')}
            >
              <SvgIcon>
                <path d="M14 4h6v6M10 14 20 4M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
              </SvgIcon>
              <span className="hx-pdf-btn-label">{translate('الرابط', 'Direct')}</span>
            </a>
          )}

          {/* Close Button */}
          <button
            ref={closeBtnRef}
            data-testid="pdf-reader-close"
            type="button"
            className="hx-pdf-header-btn hx-pdf-header-btn--icon hx-pdf-header-btn--close"
            aria-label={translate('إغلاق القارئ', 'Close reader')}
            title={translate('إغلاق (Esc)', 'Close (Esc)')}
            onClick={onClose}
          >
            <SvgIcon>
              <path d="M6 6l12 12M18 6 6 18" />
            </SvgIcon>
          </button>
        </div>
      </div>

      {/* Precision Command Toolbar */}
      <div className="hx-pdf-toolbar">
        {/* Drawer, Search & Layout */}
        <div className="hx-pdf-toolbar-group">
          <button
            type="button"
            data-testid="pdf-reader-sidebar-toggle"
            className={`hx-pdf-tool-btn${sidebarOpen ? ' is-active' : ''}`}
            aria-pressed={sidebarOpen}
            aria-expanded={sidebarOpen}
            aria-controls="pdf-reader-sidebar"
            aria-label={translate(
              'إظهار أو إخفاء الفهرس والمصغّرات',
              'Toggle index and thumbnails sidebar'
            )}
            onClick={onToggleSidebar}
            title={translate('إظهار أو إخفاء الفهرس والمصغّرات', 'Toggle sidebar')}
          >
            <SvgIcon>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </SvgIcon>
            <span className="hx-pdf-btn-label">{translate('الفهرس', 'Index')}</span>
          </button>

          <button
            ref={searchToggleRef}
            type="button"
            data-testid="pdf-reader-search-toggle"
            className={`hx-pdf-tool-btn${searchOpen ? ' is-active' : ''}`}
            aria-pressed={searchOpen}
            aria-expanded={searchOpen}
            aria-controls="pdf-reader-searchbar"
            aria-label={translate('بحث داخل النص', 'Find in document')}
            disabled={status !== 'ready'}
            onClick={onToggleSearch}
            title={translate('بحث داخل النص (Ctrl+F)', 'Find in document (Ctrl+F)')}
          >
            <SvgIcon>
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </SvgIcon>
            <span className="hx-pdf-btn-label">{translate('بحث', 'Find')}</span>
          </button>

          <div
            className="hx-pdf-segmented hx-pdf-from-desktop"
            role="group"
            aria-label={translate('وضع العرض', 'Page layout mode')}
            data-testid="pdf-reader-layout"
          >
            {layoutModes.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`hx-pdf-segmented-btn${layoutMode === m.id ? ' is-active' : ''}`}
                aria-pressed={layoutMode === m.id}
                aria-label={translate(m.ar, m.en)}
                disabled={status !== 'ready'}
                onClick={() => onLayoutChange(m.id)}
              >
                {translate(m.ar, m.en)}
              </button>
            ))}
          </div>
        </div>

        {/* Page Navigation */}
        <div className="hx-pdf-toolbar-group hx-pdf-toolbar-group--nav">
          <button
            type="button"
            className="hx-pdf-tool-btn hx-pdf-tool-btn--icon"
            disabled={status !== 'ready' || currentPage <= 1}
            onClick={onPrevPage}
            aria-label={translate('الصفحة السابقة', 'Previous page')}
            title={translate('الصفحة السابقة', 'Previous page')}
          >
            <SvgIcon className="hx-pdf-icon hx-pdf-icon--flip-rtl">
              <path d="m15 6-6 6 6 6" />
            </SvgIcon>
          </button>

          <form className="hx-pdf-page-form" onSubmit={handlePageSubmit}>
            <input
              data-testid="pdf-reader-page-input"
              type="text"
              inputMode="numeric"
              className="hx-pdf-page-input"
              value={displayedPageInput}
              disabled={status !== 'ready'}
              onChange={(e) => setDraftPageInput(e.target.value)}
              onBlur={() => commitPageDraft(displayedPageInput)}
              aria-label={translate('رقم الصفحة الحالية', 'Current page number')}
            />
            <span className="hx-pdf-page-total">
              / {totalPages > 0 ? formatNumber(totalPages) : '—'}
            </span>
          </form>

          <button
            type="button"
            className="hx-pdf-tool-btn hx-pdf-tool-btn--icon"
            disabled={status !== 'ready' || currentPage >= totalPages}
            onClick={onNextPage}
            aria-label={translate('الصفحة التالية', 'Next page')}
            title={translate('الصفحة التالية', 'Next page')}
          >
            <SvgIcon className="hx-pdf-icon hx-pdf-icon--flip-rtl">
              <path d="m9 6 6 6-6 6" />
            </SvgIcon>
          </button>
        </div>

        {/* Zoom, Rotate & Responsive Overflow Menu */}
        <div className="hx-pdf-toolbar-group hx-pdf-toolbar-group--zoom">
          <button
            type="button"
            className="hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-from-mobile-lg"
            disabled={!canZoomOut}
            onClick={onZoomOut}
            aria-label={translate('تصغير', 'Zoom out')}
            title={translate('تصغير (-)', 'Zoom out (-)')}
          >
            <SvgIcon>
              <path d="M6 12h12" />
            </SvgIcon>
          </button>

          <select
            className="hx-pdf-select hx-pdf-zoom-select hx-pdf-from-tablet"
            value={zoomSelectValue}
            disabled={status !== 'ready'}
            aria-label={translate('مستوى التكبير', 'Zoom level')}
            onChange={(e) => handleZoomSelectChange(e.target.value)}
          >
            <option value="fit-width">{translate('ملاءمة العرض', 'Fit width')}</option>
            <option value="fit-page">{translate('ملاءمة الصفحة', 'Fit page')}</option>
            {zoomSelectValue === '__custom__' && (
              <option value="__custom__">{customPercentLabel}</option>
            )}
            {ZOOM_PRESETS.map((preset) => (
              <option key={preset} value={String(preset)}>
                {Math.round(preset * 100)}%
              </option>
            ))}
          </select>

          <button
            type="button"
            className="hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-from-mobile-lg"
            disabled={!canZoomIn}
            onClick={onZoomIn}
            aria-label={translate('تكبير', 'Zoom in')}
            title={translate('تكبير (+)', 'Zoom in (+)')}
          >
            <SvgIcon>
              <path d="M12 6v12M6 12h12" />
            </SvgIcon>
          </button>

          <button
            type="button"
            className={`hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-from-tablet${rotateApplied ? ' is-active' : ''}`}
            aria-pressed={rotateApplied}
            disabled={status !== 'ready'}
            onClick={onRotate}
            aria-label={translate('تدوير الصفحات 90 درجة', 'Rotate clockwise 90 degrees')}
            title={translate('تدوير (R)', 'Rotate 90° (R)')}
          >
            <SvgIcon>
              <path d="M20 5v5h-5" />
              <path d="M20 10a8 8 0 1 0-2.3 5.6" />
            </SvgIcon>
          </button>

          {/* Responsive Overflow Menu Trigger (visible <1024px) */}
          <div className="hx-pdf-more-wrap">
            <button
              ref={moreBtnRef}
              type="button"
              data-testid="pdf-reader-more"
              className={`hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-more-trigger${overflowOpen ? ' is-active' : ''}`}
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              aria-controls="pdf-overflow-menu"
              aria-label={translate('المزيد من أدوات القارئ', 'More reader tools')}
              title={translate('المزيد من الأدوات', 'More tools')}
              onClick={() => setOverflowOpen((prev) => !prev)}
            >
              <HeritageIcon name="more" size={18} className="hx-pdf-icon" />
            </button>

            {overflowOpen && (
              <div
                id="pdf-overflow-menu"
                ref={overflowMenuRef}
                data-testid="pdf-reader-overflow-menu"
                className="hx-pdf-overflow-menu"
                role="region"
                aria-label={translate('أدوات القارئ الإضافية', 'Additional reader tools')}
              >
                {/* Layout Mode (needed <1024px) */}
                <div className="hx-pdf-overflow-section">
                  <span className="hx-pdf-overflow-heading">
                    {translate('وضع العرض', 'Page layout mode')}
                  </span>
                  <div
                    className="hx-pdf-segmented hx-pdf-overflow-segmented"
                    role="group"
                    aria-label={translate('وضع العرض', 'Page layout mode')}
                  >
                    {layoutModes.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`hx-pdf-segmented-btn${layoutMode === m.id ? ' is-active' : ''}`}
                        aria-pressed={layoutMode === m.id}
                        aria-label={translate(m.ar, m.en)}
                        disabled={status !== 'ready'}
                        onClick={() => onLayoutChange(m.id)}
                      >
                        {translate(m.ar, m.en)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paper Reading Filter (needed <768px) */}
                <div className="hx-pdf-overflow-section hx-pdf-overflow-lt-tablet">
                  <span className="hx-pdf-overflow-heading">
                    {translate('نمط ورقة القراءة', 'Paper reading filter')}
                  </span>
                  <div
                    className="hx-pdf-overflow-row"
                    role="group"
                    aria-label={translate('نمط ورقة القراءة', 'Paper reading filter')}
                  >
                    {paperModes.map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        className={`hx-pdf-tool-btn hx-pdf-overflow-chip${paperMode === mode.id ? ' is-active' : ''}`}
                        aria-pressed={paperMode === mode.id}
                        aria-label={translate(mode.ar, mode.en)}
                        onClick={() => onPaperModeChange(mode.id)}
                      >
                        <span
                          className={`hx-pdf-swatch hx-pdf-swatch--${mode.id}`}
                          aria-hidden="true"
                        />
                        <span>{translate(mode.ar, mode.en)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom & Rotate (needed <768px) */}
                <div className="hx-pdf-overflow-section hx-pdf-overflow-lt-tablet">
                  <span className="hx-pdf-overflow-heading">
                    {translate('التكبير والتدوير', 'Zoom and rotation')}
                  </span>
                  <div className="hx-pdf-overflow-row">
                    <button
                      type="button"
                      className="hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-overflow-lt-mobile-lg"
                      disabled={!canZoomOut}
                      onClick={onZoomOut}
                      aria-label={translate('تصغير', 'Zoom out')}
                    >
                      <SvgIcon>
                        <path d="M6 12h12" />
                      </SvgIcon>
                    </button>

                    <select
                      className="hx-pdf-select hx-pdf-zoom-select hx-pdf-overflow-zoom"
                      value={zoomSelectValue}
                      disabled={status !== 'ready'}
                      aria-label={translate('مستوى التكبير', 'Zoom level')}
                      onChange={(e) => handleZoomSelectChange(e.target.value)}
                    >
                      <option value="fit-width">
                        {translate('ملاءمة العرض', 'Fit width')}
                      </option>
                      <option value="fit-page">
                        {translate('ملاءمة الصفحة', 'Fit page')}
                      </option>
                      {zoomSelectValue === '__custom__' && (
                        <option value="__custom__">{customPercentLabel}</option>
                      )}
                      {ZOOM_PRESETS.map((preset) => (
                        <option key={preset} value={String(preset)}>
                          {Math.round(preset * 100)}%
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="hx-pdf-tool-btn hx-pdf-tool-btn--icon hx-pdf-overflow-lt-mobile-lg"
                      disabled={!canZoomIn}
                      onClick={onZoomIn}
                      aria-label={translate('تكبير', 'Zoom in')}
                    >
                      <SvgIcon>
                        <path d="M12 6v12M6 12h12" />
                      </SvgIcon>
                    </button>

                    <button
                      type="button"
                      className={`hx-pdf-tool-btn hx-pdf-tool-btn--icon${rotateApplied ? ' is-active' : ''}`}
                      aria-pressed={rotateApplied}
                      disabled={status !== 'ready'}
                      onClick={onRotate}
                      aria-label={translate(
                        'تدوير الصفحات 90 درجة',
                        'Rotate clockwise 90 degrees'
                      )}
                    >
                      <SvgIcon>
                        <path d="M20 5v5h-5" />
                        <path d="M20 10a8 8 0 1 0-2.3 5.6" />
                      </SvgIcon>
                    </button>
                  </div>
                </div>

                {/* Window Actions (Fullscreen <480px, Direct Link <1024px) */}
                <div className="hx-pdf-overflow-section">
                  <div className="hx-pdf-overflow-row hx-pdf-overflow-links">
                    <button
                      type="button"
                      className={`hx-pdf-tool-btn hx-pdf-overflow-action hx-pdf-overflow-lt-mobile-lg${isFullscreen ? ' is-active' : ''}`}
                      aria-pressed={isFullscreen}
                      aria-label={fullscreenLabel}
                      onClick={() => {
                        setOverflowOpen(false);
                        onToggleFullscreen();
                      }}
                    >
                      <SvgIcon>
                        {isFullscreen ? (
                          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                        ) : (
                          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                        )}
                      </SvgIcon>
                      <span>{fullscreenLabel}</span>
                    </button>

                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hx-pdf-tool-btn hx-pdf-overflow-action"
                        aria-label={translate(
                          'فتح الملف مباشرة في نافذة جديدة',
                          'Open original PDF in new tab'
                        )}
                        onClick={() => setOverflowOpen(false)}
                      >
                        <SvgIcon>
                          <path d="M14 4h6v6M10 14 20 4M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
                        </SvgIcon>
                        <span>{translate('فتح الملف مباشرة', 'Open original PDF')}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reading Progress Hairline */}
      <div className="hx-pdf-progress-track" aria-hidden="true">
        <div className="hx-pdf-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Collapsible Arabic/English In-Document Search Bar */}
      {searchOpen && (
        <div id="pdf-reader-searchbar" className="hx-pdf-searchbar" role="search">
          <div className="hx-pdf-search-input-wrap">
            <span className="hx-pdf-search-icon" aria-hidden="true">
              <SvgIcon className="hx-pdf-icon hx-pdf-icon--sm">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.2-4.2" />
              </SvgIcon>
            </span>
            <input
              ref={searchInputRef}
              data-testid="pdf-reader-search-input"
              type="search"
              className="hx-pdf-search-input"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSearchStep(e.shiftKey ? 'prev' : 'next');
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  closeSearchAndRestoreFocus();
                }
              }}
              placeholder={translate(
                'ابحث في محتوى الصفحات (عربي / إنكليزي)…',
                'Search inside document text…'
              )}
              aria-label={translate('بحث داخل نص المستند', 'Search in document')}
            />
            {searchQuery && (
              <button
                type="button"
                className="hx-pdf-search-clear"
                onClick={() => {
                  onSearchQueryChange('');
                  searchInputRef.current?.focus();
                }}
                aria-label={translate('مسح البحث', 'Clear search')}
                title={translate('مسح البحث', 'Clear search')}
              >
                <span className="hx-pdf-search-clear-pill" aria-hidden="true">
                  <SvgIcon className="hx-pdf-icon hx-pdf-icon--sm">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </SvgIcon>
                </span>
              </button>
            )}
          </div>

          <span className="hx-pdf-search-status" aria-live="polite">
            {!searchQuery.trim()
              ? translate('اكتب كلمة للبحث', 'Type to find')
              : isSearching
                ? translate('جارٍ الفهرسة…', 'Searching…')
                : totalMatches > 0
                  ? `${formatNumber(currentHitPosition)} / ${formatNumber(totalMatches)}`
                  : translate('لا توجد نتائج', '0 matches')}
          </span>

          <div className="hx-pdf-search-actions">
            <button
              type="button"
              className="hx-pdf-tool-btn hx-pdf-search-nav-btn"
              disabled={totalMatches === 0}
              onClick={() => onSearchStep('prev')}
              aria-label={translate('النتيجة السابقة', 'Previous match')}
            >
              {translate('السابق', 'Prev')}
            </button>

            <button
              type="button"
              className="hx-pdf-tool-btn hx-pdf-search-nav-btn"
              disabled={totalMatches === 0}
              onClick={() => onSearchStep('next')}
              aria-label={translate('النتيجة التالية', 'Next match')}
            >
              {translate('التالي', 'Next')}
            </button>

            <button
              type="button"
              className="hx-pdf-tool-btn hx-pdf-tool-btn--icon"
              onClick={closeSearchAndRestoreFocus}
              aria-label={translate('إغلاق شريط البحث', 'Close search bar')}
              title={translate('إغلاق شريط البحث (Esc)', 'Close search bar (Esc)')}
            >
              <SvgIcon className="hx-pdf-icon hx-pdf-icon--sm">
                <path d="M6 6l12 12M18 6 6 18" />
              </SvgIcon>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
