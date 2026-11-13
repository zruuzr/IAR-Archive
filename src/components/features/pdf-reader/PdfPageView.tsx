import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask, TextLayer } from 'pdfjs-dist';
import { normalizeSearchText } from '@/lib/arabic-search';
import type { Language } from '@/types/book';
import { loadPdfJs, type PdfPaperMode } from './pdf-engine';

export interface PdfPageViewProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  paperMode: PdfPaperMode;
  searchQuery: string;
  isActivePage?: boolean;
  isCurrentSearchHit?: boolean;
  lang: Language;
  /** Enables IntersectionObserver deferral in continuous scroll mode. */
  lazy?: boolean;
  /** Estimated aspect ratio (height / width) before page metadata loads. */
  defaultAspectRatio?: number;
  /** Exact known page dimensions at rotation + current scale (prevents layout shift). */
  knownBaseSize?: { width: number; height: number };
  onPageDimensions?: (pageNumber: number, width: number, height: number) => void;
  onActivate?: (pageNumber: number) => void;
  pageRef?: (node: HTMLDivElement | null) => void;
}

export function PdfPageView({
  pdfDoc,
  pageNumber,
  scale,
  rotation,
  paperMode,
  searchQuery,
  isActivePage = false,
  isCurrentSearchHit = false,
  lang,
  lazy = false,
  defaultAspectRatio = 1.414,
  knownBaseSize,
  onPageDimensions,
  onActivate,
  pageRef
}: PdfPageViewProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  const [observedInView, setObservedInView] = useState(false);
  const shouldRender = !lazy || observedInView;
  const [renderedSize, setRenderedSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [textRenderTick, setTextRenderTick] = useState(0);

  // Sync caller ref
  const setCombinedRef = (node: HTMLDivElement | null) => {
    sheetRef.current = node;
    pageRef?.(node);
  };

  // Defer off-screen rendering in continuous scroll mode
  useEffect(() => {
    if (!lazy || observedInView) {
      return;
    }
    const target = sheetRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setObservedInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '650px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [lazy, observedInView, pageNumber]);

  // Render HiDPI canvas + selectable PDF.js TextLayer
  useEffect(() => {
    if (!shouldRender) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let textLayerInstance: TextLayer | null = null;
    let loadedPage: PDFPageProxy | null = null;

    async function renderPage() {
      const pdfjs = await loadPdfJs();
      const page = await pdfDoc.getPage(pageNumber);
      loadedPage = page;
      if (cancelled) return;

      const baseViewport = page.getViewport({ scale: 1, rotation });
      onPageDimensions?.(pageNumber, baseViewport.width, baseViewport.height);

      const viewport = page.getViewport({ scale, rotation });
      const cssWidth = Math.max(1, Math.floor(viewport.width));
      const cssHeight = Math.max(1, Math.floor(viewport.height));
      if (!cancelled) {
        setRenderedSize({ width: cssWidth, height: cssHeight });
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          2.5
        );
        canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
        canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        let ctx: CanvasRenderingContext2D | null = null;
        try {
          ctx = canvas.getContext('2d', { alpha: false });
        } catch {
          ctx = null;
        }

        if (ctx) {
          renderTask = page.render({
            canvasContext: ctx,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
          });
          await renderTask.promise;
        }
      }

      if (cancelled) return;

      const textContainer = textLayerRef.current;
      if (textContainer && typeof pdfjs.TextLayer === 'function') {
        textContainer.replaceChildren();
        textContainer.style.setProperty('--scale-factor', String(viewport.scale));
        textContainer.style.width = `${cssWidth}px`;
        textContainer.style.height = `${cssHeight}px`;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        textLayerInstance = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textContainer,
          viewport
        });
        await textLayerInstance.render();
        if (!cancelled) {
          setTextRenderTick((tick) => tick + 1);
        }
      }
    }

    renderPage().catch((err: unknown) => {
      if (cancelled) return;
      const name = err instanceof Error ? err.name : '';
      if (name === 'RenderingCancelledException' || name === 'AbortException') {
        return;
      }
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore already completed render tasks
        }
      }
      if (textLayerInstance) {
        try {
          textLayerInstance.cancel();
        } catch {
          // Ignore
        }
      }
      if (loadedPage) {
        try {
          loadedPage.cleanup();
        } catch {
          // Ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation, shouldRender, onPageDimensions]);

  // Apply search hit highlights on the already-rendered text layer without re-rendering canvas
  useEffect(() => {
    const textContainer = textLayerRef.current;
    if (!textContainer) return;

    const spans = textContainer.querySelectorAll('span');
    spans.forEach((span) => {
      span.classList.remove('hx-pdf-hit', 'hx-pdf-hit--current');
    });

    if (!searchQuery) return;

    const queryTokens = searchQuery.split(/\s+/).filter(Boolean);
    spans.forEach((span) => {
      const normalized = normalizeSearchText(span.textContent || '', lang);
      if (!normalized) return;
      const matchesSpan =
        normalized.includes(searchQuery) ||
        (queryTokens.length > 1 &&
          queryTokens.some((token) => token.length >= 2 && normalized.includes(token)));
      if (matchesSpan) {
        span.classList.add('hx-pdf-hit');
        if (isCurrentSearchHit) {
          span.classList.add('hx-pdf-hit--current');
        }
      }
    });
  }, [searchQuery, isCurrentSearchHit, lang, textRenderTick]);

  const fallbackW = knownBaseSize
    ? Math.max(1, Math.floor(knownBaseSize.width * scale))
    : Math.max(180, Math.floor(595 * scale));
  const fallbackH = knownBaseSize
    ? Math.max(1, Math.floor(knownBaseSize.height * scale))
    : Math.floor(fallbackW * defaultAspectRatio);

  const sheetWidth = renderedSize?.width ?? fallbackW;
  const sheetHeight = renderedSize?.height ?? fallbackH;

  return (
    <div
      ref={setCombinedRef}
      data-page-number={pageNumber}
      data-paper-mode={paperMode}
      className={`hx-pdf-sheet${isActivePage ? ' hx-pdf-sheet--active' : ''}`}
      style={{ width: `${sheetWidth}px`, height: `${sheetHeight}px` }}
      onClick={() => onActivate?.(pageNumber)}
    >
      <canvas ref={canvasRef} className="hx-pdf-canvas" dir="ltr" />
      <div ref={textLayerRef} className="hx-pdf-textlayer" dir="ltr" />
      <span className="hx-pdf-sheet-badge" aria-hidden="true">
        {pageNumber}
      </span>
    </div>
  );
}
