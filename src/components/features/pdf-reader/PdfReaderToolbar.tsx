import { useState, type FormEvent, type RefObject } from 'react';
import { AN_SIGN, HeritageIcon } from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import type { Book } from '@/types/book';
import {
  ZOOM_PRESETS,
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

function SvgIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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
  const { isRTL, translate, getBookField, formatNumber } = useI18n();
  const [draftPageInput, setDraftPageInput] = useState<string | null>(null);
  const displayedPageInput = draftPageInput ?? String(currentPage);

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
          {/* Paper Reading Mode Switch */}
          <div
            className="hx-pdf-paper-switch"
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
              title={translate('تحميل نسخة PDF', 'Download PDF')}
            >
              <HeritageIcon name="download" size={15} />
              <span className="hx-pdf-btn-label">{translate('تحميل', 'Download')}</span>
            </button>
          ) : safeUrl ? (
            <a
              href={safeUrl}
              download={book?.file_name || undefined}
              className="hx-pdf-header-btn"
              title={translate('تحميل نسخة PDF', 'Download PDF')}
            >
              <HeritageIcon name="download" size={15} />
              <span className="hx-pdf-btn-label">{translate('تحميل', 'Download')}</span>
            </a>
          ) : null}

          {/* Fullscreen */}
          <button
            type="button"
            className="hx-pdf-header-btn hx-pdf-header-btn--icon"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={translate(
              isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة',
              isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
            )}
            title={translate(
              isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة',
              isFullscreen ? 'Exit fullscreen' : 'Fullscreen'
            )}
          >
            <SvgIcon size={15}>
              {isFullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              )}
            </SvgIcon>
          </button>

          {/* Direct External URL */}
          {safeUrl && (
            <a
              data-testid="pdf-reader-direct-link"
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hx-pdf-header-btn"
              title={translate('فتح الملف مباشرة في نافذة جديدة', 'Open original PDF')}
            >
              <SvgIcon size={14}>
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
            <SvgIcon size={16}>
              <path d="M6 6l12 12M18 6 6 18" />
            </SvgIcon>
          </button>
        </div>
      </div>

      {/* Precision Command Toolbar */}
      <div className="hx-pdf-toolbar">
        {/* Drawer & Search & Layout */}
        <div className="hx-pdf-toolbar-group">
          <button
            type="button"
            data-testid="pdf-reader-sidebar-toggle"
            className={`hx-pdf-tool-btn${sidebarOpen ? ' is-active' : ''}`}
            aria-pressed={sidebarOpen}
            onClick={onToggleSidebar}
            title={translate('إظهار أو إخفاء الفهرس والمصغّرات', 'Toggle sidebar')}
          >
            <SvgIcon size={15}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
            </SvgIcon>
            <span className="hx-pdf-btn-label">{translate('الفهرس', 'Index')}</span>
          </button>

          <button
            type="button"
            data-testid="pdf-reader-search-toggle"
            className={`hx-pdf-tool-btn${searchOpen ? ' is-active' : ''}`}
            aria-pressed={searchOpen}
            disabled={status !== 'ready'}
            onClick={onToggleSearch}
            title={translate('بحث داخل النص (Ctrl+F)', 'Find in document (Ctrl+F)')}
          >
            <SvgIcon size={15}>
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </SvgIcon>
            <span className="hx-pdf-btn-label">{translate('بحث', 'Find')}</span>
          </button>

          <div
            className="hx-pdf-segmented"
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
                disabled={status !== 'ready'}
                onClick={() => onLayoutChange(m.id)}
              >
                {translate(m.ar, m.en)}
              </button>
            ))}
          </div>
        </div>

        {/* Page Navigation */}
        <div className="hx-pdf-toolbar-group">
          <button
            type="button"
            className="hx-pdf-tool-btn"
            disabled={status !== 'ready' || currentPage <= 1}
            onClick={onPrevPage}
            aria-label={translate('الصفحة السابقة', 'Previous page')}
            title={translate('الصفحة السابقة', 'Previous page')}
          >
            <SvgIcon size={15}>
              {isRTL ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
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
            className="hx-pdf-tool-btn"
            disabled={status !== 'ready' || currentPage >= totalPages}
            onClick={onNextPage}
            aria-label={translate('الصفحة التالية', 'Next page')}
            title={translate('الصفحة التالية', 'Next page')}
          >
            <SvgIcon size={15}>
              {isRTL ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
            </SvgIcon>
          </button>
        </div>

        {/* Zoom & Rotate */}
        <div className="hx-pdf-toolbar-group">
          <button
            type="button"
            className="hx-pdf-tool-btn"
            disabled={status !== 'ready'}
            onClick={onZoomOut}
            aria-label={translate('تصغير', 'Zoom out')}
            title={translate('تصغير (-)', 'Zoom out (-)')}
          >
            <SvgIcon size={15}>
              <path d="M6 12h12" />
            </SvgIcon>
          </button>

          <select
            className="hx-select-field hx-pdf-zoom-select"
            value={zoomSelectValue}
            disabled={status !== 'ready'}
            aria-label={translate('مستوى التكبير', 'Zoom level')}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'fit-width' || val === 'fit-page') {
                onZoomSelect(val);
                return;
              }
              const parsed = Number.parseFloat(val);
              if (Number.isFinite(parsed)) {
                onZoomSelect(parsed);
              }
            }}
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
            className="hx-pdf-tool-btn"
            disabled={status !== 'ready'}
            onClick={onZoomIn}
            aria-label={translate('تكبير', 'Zoom in')}
            title={translate('تكبير (+)', 'Zoom in (+)')}
          >
            <SvgIcon size={15}>
              <path d="M12 6v12M6 12h12" />
            </SvgIcon>
          </button>

          <button
            type="button"
            className="hx-pdf-tool-btn"
            disabled={status !== 'ready'}
            onClick={onRotate}
            aria-label={translate('تدوير الصفحات 90 درجة', 'Rotate clockwise 90 degrees')}
            title={translate('تدوير (R)', 'Rotate 90° (R)')}
          >
            <SvgIcon size={15}>
              <path d="M20 5v5h-5" />
              <path d="M20 10a8 8 0 1 0-2.3 5.6" />
            </SvgIcon>
          </button>
        </div>
      </div>

      {/* Reading Progress Hairline */}
      <div className="hx-pdf-progress-track" aria-hidden="true">
        <div className="hx-pdf-progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Collapsible Arabic/English In-Document Search Bar */}
      {searchOpen && (
        <div className="hx-pdf-searchbar" role="search">
          <div className="hx-pdf-search-input-wrap">
            <span className="hx-pdf-search-icon" aria-hidden="true">
              <SvgIcon size={14}>
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
                  onCloseSearch();
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
                onClick={() => onSearchQueryChange('')}
                aria-label={translate('مسح البحث', 'Clear search')}
              >
                ×
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

          <button
            type="button"
            className="hx-pdf-tool-btn"
            disabled={totalMatches === 0}
            onClick={() => onSearchStep('prev')}
            aria-label={translate('النتيجة السابقة', 'Previous match')}
          >
            {translate('السابق', 'Prev')}
          </button>

          <button
            type="button"
            className="hx-pdf-tool-btn"
            disabled={totalMatches === 0}
            onClick={() => onSearchStep('next')}
            aria-label={translate('النتيجة التالية', 'Next match')}
          >
            {translate('التالي', 'Next')}
          </button>

          <button
            type="button"
            className="hx-pdf-tool-btn"
            onClick={onCloseSearch}
            aria-label={translate('إغلاق شريط البحث', 'Close search bar')}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
