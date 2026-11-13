import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import { HeritageBookCover, HeritageIcon, pickCloth } from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCitation, getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { AN_SIGN } from '@/components/heritage';
import type { PdfOutlineNode, PdfSidebarTab } from './pdf-engine';

interface ThumbnailTileProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  isActive: boolean;
  label: string;
  onSelect: (pageNumber: number) => void;
  scrollRoot: HTMLDivElement | null;
}

function ThumbnailTile({
  pdfDoc,
  pageNumber,
  isActive,
  label,
  onSelect,
  scrollRoot
}: ThumbnailTileProps) {
  const tileRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(pageNumber <= 6);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = tileRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
        }
      },
      { root: scrollRoot, rootMargin: '220px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, scrollRoot]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let pageRef: PDFPageProxy | null = null;

    async function drawThumb() {
      const page = await pdfDoc.getPage(pageNumber);
      pageRef = page;
      if (cancelled) return;

      const baseVp = page.getViewport({ scale: 1 });
      const targetWidth = 136;
      const thumbScale = targetWidth / Math.max(1, baseVp.width);
      const viewport = page.getViewport({ scale: thumbScale });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
      canvas.height = Math.max(1, Math.floor(viewport.height * dpr));

      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d', { alpha: false });
      } catch {
        ctx = null;
      }
      if (!ctx) return;

      renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined
      });
      await renderTask.promise;
      if (!cancelled) {
        setRendered(true);
      }
    }

    drawThumb().catch(() => {
      // Ignore cancellation / jsdom mock absence
    });

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // Ignore
        }
      }
      if (pageRef) {
        try {
          pageRef.cleanup();
        } catch {
          // Ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, visible]);

  useEffect(() => {
    if (isActive && tileRef.current?.scrollIntoView) {
      tileRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isActive]);

  return (
    <button
      ref={tileRef}
      type="button"
      className={`hx-pdf-thumb${isActive ? ' is-active' : ''}`}
      onClick={() => onSelect(pageNumber)}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="hx-pdf-thumb-frame">
        <canvas ref={canvasRef} className="hx-pdf-thumb-canvas" />
        {!rendered && (
          <span className="hx-pdf-thumb-placeholder" aria-hidden="true">
            {AN_SIGN}
          </span>
        )}
      </div>
      <span className="hx-pdf-thumb-num">{pageNumber}</span>
    </button>
  );
}

function findActiveOutlineId(
  nodes: PdfOutlineNode[],
  currentPage: number
): string | null {
  let activeId: string | null = null;
  const walk = (items: PdfOutlineNode[]) => {
    for (const node of items) {
      if (node.pageNumber !== null && node.pageNumber <= currentPage) {
        activeId = node.id;
      }
      if (node.items.length > 0) {
        walk(node.items);
      }
    }
  };
  walk(nodes);
  return activeId;
}

export interface PdfReaderSidebarProps {
  open: boolean;
  activeTab: PdfSidebarTab;
  onTabChange: (tab: PdfSidebarTab) => void;
  onCloseMobile: () => void;
  pdfDoc: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  outline: PdfOutlineNode[];
  book: Book | null;
  onSelectPage: (pageNumber: number) => void;
}

export function PdfReaderSidebar({
  open,
  activeTab,
  onTabChange,
  onCloseMobile,
  pdfDoc,
  totalPages,
  currentPage,
  outline,
  book,
  onSelectPage
}: PdfReaderSidebarProps) {
  const { lang, translate, getBookField, formatNumber } = useI18n();
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const currentCitationKey = `${book?.id ?? 'none'}:${lang}`;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copiedCitation = copiedKey === currentCitationKey;

  const pageNumbers = useMemo(
    () => Array.from({ length: Math.max(0, totalPages) }, (_, idx) => idx + 1),
    [totalPages]
  );

  const activeOutlineId = useMemo(
    () => findActiveOutlineId(outline, currentPage),
    [outline, currentPage]
  );

  if (!open) return null;

  const renderOutlineNodes = (nodes: PdfOutlineNode[], depth = 0) => (
    <ul className="hx-pdf-outline-list">
      {nodes.map((node) => {
        const isActive = node.id === activeOutlineId;
        return (
          <li key={node.id}>
            <button
              type="button"
              className={`hx-pdf-outline-item-btn${isActive ? ' is-active' : ''}`}
              style={{ paddingInlineStart: `${depth * 14 + 9}px` }}
              disabled={node.pageNumber === null}
              onClick={() => {
                if (node.pageNumber !== null) {
                  onSelectPage(node.pageNumber);
                }
              }}
            >
              <span>{node.title}</span>
              {node.pageNumber !== null && (
                <span className="hx-pdf-outline-page">
                  {formatNumber(node.pageNumber)}
                </span>
              )}
            </button>
            {node.items.length > 0 && renderOutlineNodes(node.items, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  const citationText = book ? formatCitation(book, lang) : '';

  const handleCopyCitation = () => {
    if (!citationText || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    const targetKey = currentCitationKey;
    navigator.clipboard
      .writeText(citationText)
      .then(() => {
        setCopiedKey(targetKey);
        setTimeout(() => {
          setCopiedKey((prev) => (prev === targetKey ? null : prev));
        }, 1800);
      })
      .catch(() => {
        // Ignore clipboard denial
      });
  };

  return (
    <>
      <div
        className="hx-pdf-sidebar-backdrop"
        aria-hidden="true"
        onClick={onCloseMobile}
      />
      <aside
        className="hx-pdf-sidebar"
        aria-label={translate('لوحة تنقّل المستند', 'Document navigation drawer')}
        data-testid="pdf-reader-sidebar"
      >
        <div className="hx-pdf-sidebar-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'thumbnails'}
            className={`hx-pdf-sidebar-tab${activeTab === 'thumbnails' ? ' is-active' : ''}`}
            onClick={() => onTabChange('thumbnails')}
          >
            {translate('الصفحات', 'Pages')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'outline'}
            className={`hx-pdf-sidebar-tab${activeTab === 'outline' ? ' is-active' : ''}`}
            onClick={() => onTabChange('outline')}
          >
            {translate('الفهرس', 'Outline')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'info'}
            className={`hx-pdf-sidebar-tab${activeTab === 'info' ? ' is-active' : ''}`}
            onClick={() => onTabChange('info')}
          >
            {translate('البطاقة', 'Info')}
          </button>
        </div>

        <div ref={setScrollRoot} className="hx-pdf-sidebar-body">
          {activeTab === 'thumbnails' && (
            <>
              {pdfDoc && pageNumbers.length > 0 ? (
                <div className="hx-pdf-thumb-grid">
                  {pageNumbers.map((num) => (
                    <ThumbnailTile
                      key={num}
                      pdfDoc={pdfDoc}
                      pageNumber={num}
                      isActive={num === currentPage}
                      label={translate(`الانتقال إلى الصفحة ${num}`, `Go to page ${num}`)}
                      onSelect={onSelectPage}
                      scrollRoot={scrollRoot}
                    />
                  ))}
                </div>
              ) : (
                <p className="hx-pdf-sidebar-empty">
                  {translate(
                    'ستظهر مصغّرات الصفحات فور تحميل المستند.',
                    'Page thumbnails will appear once the document loads.'
                  )}
                </p>
              )}
            </>
          )}

          {activeTab === 'outline' && (
            <>
              {outline.length > 0 ? (
                renderOutlineNodes(outline)
              ) : (
                <p className="hx-pdf-sidebar-empty">
                  {translate(
                    'لا يتضمّن هذا الملف فهرس عناوين مدمجاً؛ يمكنك التنقّل عبر المصغّرات أو البحث الداخلي.',
                    'This PDF has no embedded table of contents. Use thumbnails or in-document search.'
                  )}
                </p>
              )}
            </>
          )}

          {activeTab === 'info' && book && (
            <div className="hx-pdf-info-card">
              <div className="hx-pdf-info-cover">
                <HeritageBookCover
                  title={getBookField(book, 'title')}
                  category={getCategoryLabel(book, lang)}
                  year={book.year && book.year !== '0' ? book.year : undefined}
                  cloth={pickCloth(book.id)}
                  image={book.cover_image || undefined}
                  decorative
                />
              </div>

              <dl className="hx-pdf-info-list">
                <div className="hx-pdf-info-row">
                  <dt>{translate('التصنيف', 'Category')}</dt>
                  <dd>{getCategoryLabel(book, lang)}</dd>
                </div>
                {getBookField(book, 'author') && (
                  <div className="hx-pdf-info-row">
                    <dt>{translate('المؤلف', 'Author')}</dt>
                    <dd>{getBookField(book, 'author')}</dd>
                  </div>
                )}
                {book.year && book.year !== '0' && (
                  <div className="hx-pdf-info-row">
                    <dt>{translate('السنة', 'Year')}</dt>
                    <dd dir="ltr">{book.year}</dd>
                  </div>
                )}
                {(totalPages > 0 || (book.pages && book.pages !== '0')) && (
                  <div className="hx-pdf-info-row">
                    <dt>{translate('الصفحات', 'Pages')}</dt>
                    <dd>
                      {formatNumber(
                        totalPages > 0 ? totalPages : Number(book.pages) || 0
                      )}
                    </dd>
                  </div>
                )}
                {book.file_size && (
                  <div className="hx-pdf-info-row">
                    <dt>{translate('الحجم', 'Size')}</dt>
                    <dd dir="ltr">{book.file_size}</dd>
                  </div>
                )}
              </dl>

              {citationText && (
                <div className="hx-pdf-citation-box">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <strong className="text-[11.5px]">
                      {translate('التوثيق الأكاديمي', 'Citation')}
                    </strong>
                    <button
                      type="button"
                      className="hx-pdf-tool-btn !h-7 !px-2 !text-[11px]"
                      onClick={handleCopyCitation}
                    >
                      <HeritageIcon name={copiedCitation ? 'check' : 'copy'} size={13} />
                      <span>
                        {copiedCitation
                          ? translate('نُسخ', 'Copied')
                          : translate('نسخ', 'Copy')}
                      </span>
                    </button>
                  </div>
                  <p className="whitespace-pre-line m-0 opacity-90">{citationText}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
