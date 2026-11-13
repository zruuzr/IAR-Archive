import { ArrowUpLeft, ArrowUpRight, FileText, HardDrive, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { HeritageFrieze, HeritageIcon } from '@/components/heritage';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { formatCitation, getBookKeyPoints, getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';

export interface SummaryDialogProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullDetails: (book: Book) => void;
  onRead: (book: Book) => void;
  onCopyCitation: (book: Book) => void;
  onCopySummary: (book: Book, summaryText: string) => void;
  onShare: (book: Book) => void;
}

/**
 * Accessible "3-Minute Reference Summary" modal dialog (`#summaryModal`).
 *
 * Allows researchers to quickly inspect a reference's core abstract, key concepts,
 * target audience, and APA citation — or copy them directly — without losing their
 * scroll position in the main catalog grid, while offering a direct link to the
 * full single-reference page (`?book=ID`).
 */
export function SummaryDialog({
  book,
  open,
  onOpenChange,
  onOpenFullDetails,
  onRead,
  onCopyCitation,
  onCopySummary,
  onShare
}: SummaryDialogProps) {
  const { lang, dir, isRTL, t, translate, getBookField } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [copiedApa, setCopiedApa] = useState<boolean>(false);

  const isDialogOpen = Boolean(open && book);
  const dialogContainerRef = useAccessibleDialog<HTMLDivElement>({
    open: isDialogOpen,
    onEscape: () => onOpenChange(false),
    initialFocusRef: closeButtonRef
  });

  if (!isDialogOpen || !book) {
    return null;
  }

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const targetAudience = getBookField(book, 'target_audience');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const category = getCategoryLabel(book, lang);
  const keyPoints = getBookKeyPoints(book, lang);
  const hasRealKeyPoints =
    (lang === 'en' && book.key_points_en.length > 0) || book.key_points.length > 0;
  const apaText = formatCitation(book, lang);
  const hasFile = Boolean(book.file_path);
  const DetailsArrowIcon = isRTL ? ArrowUpLeft : ArrowUpRight;

  const buildCopyableSummaryPayload = (): string => {
    const parts: string[] = [title];
    if (author) parts.push(author);
    if (description) parts.push(description);
    if (hasRealKeyPoints) {
      parts.push(
        `${t('txtModalIdeasTitle')}:\n` + keyPoints.map((pt) => `• ${pt}`).join('\n')
      );
    }
    return parts.join('\n\n');
  };

  const handleCopySummaryClick = () => {
    onCopySummary(book, buildCopyableSummaryPayload());
    setCopiedSummary(true);
    setTimeout(() => {
      setCopiedSummary(false);
    }, 1800);
  };

  const handleCopyApaClick = () => {
    onCopyCitation(book);
    setCopiedApa(true);
    setTimeout(() => {
      setCopiedApa(false);
    }, 1800);
  };

  return (
    <div
      id="summaryModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryBookTitle"
      dir={dir}
      data-testid="summary-dialog"
      className="hx-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      {/* Backdrop click target */}
      <div
        data-testid="summary-dialog-backdrop"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0"
      />

      <div
        ref={dialogContainerRef}
        className="hx-dialog-panel relative z-10 flex flex-col w-full max-w-2xl max-h-[90dvh] overflow-hidden"
      >
        <HeritageFrieze />

        {/* Dialog Header Band */}
        <header className="hx-dialog-band flex items-start justify-between gap-3 px-5 py-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold text-[var(--hx-gold-bright)]">
              <HeritageIcon name="summary" size={14} />
              <span>{t('summaryModalTitle')}</span>
            </div>

            <h2
              id="summaryBookTitle"
              data-testid="summary-dialog-title"
              className="font-serif text-xl sm:text-2xl font-bold text-[#f7eed6] leading-snug"
            >
              {title}
            </h2>

            {author && (
              <p
                id="summaryBookAuthor"
                className="text-xs sm:text-sm font-medium text-[#e9dfc5]/80"
              >
                {author}
              </p>
            )}
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            data-testid="summary-close-btn"
            aria-label={t('txtModalClose')}
            onClick={() => onOpenChange(false)}
            className="hx-band-icon-btn shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Summary Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Metadata Chips & Copy Summary Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                id="summaryCategory"
                className="rounded-full border border-[rgba(201,153,46,0.45)] bg-[var(--hx-gold-soft)] px-3 py-0.5 font-semibold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
              >
                {category}
              </span>

              <span
                id="summaryType"
                className="rounded-full border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-3 py-0.5 font-medium text-[var(--hx-ink-2)]"
              >
                {bookType}
              </span>

              {book.pages && book.pages !== '0' && (
                <span
                  id="summaryPages"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-2.5 py-0.5 text-[var(--hx-muted)] tabular-nums"
                >
                  <FileText
                    className="size-3 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {book.pages} {t('pagesUnit')}
                  </span>
                </span>
              )}

              {book.file_size && (
                <span
                  id="summarySize"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--hx-line)] bg-[var(--hx-surface-2)] px-2.5 py-0.5 font-mono text-[var(--hx-muted)] tabular-nums"
                >
                  <HardDrive
                    className="size-3 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] shrink-0"
                    aria-hidden="true"
                  />
                  <span>{book.file_size}</span>
                </span>
              )}
            </div>

            {(description || hasRealKeyPoints) && (
              <button
                type="button"
                data-testid="summary-copy-summary-btn"
                onClick={handleCopySummaryClick}
                className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs gap-1.5 shrink-0"
              >
                <HeritageIcon name={copiedSummary ? 'check' : 'copy'} size={13} />
                <span>
                  {copiedSummary
                    ? t('copiedToClipboard')
                    : translate('نسخ الملخص', 'Copy summary')}
                </span>
              </button>
            )}
          </div>

          {/* Reference Abstract / Description */}
          {description && (
            <section className="hx-dialog-section p-4 space-y-1.5">
              <h3 className="flex items-center gap-1.5 font-serif text-sm font-bold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]">
                <HeritageIcon name="octagram" size={12} />
                <span>{t('singleDescLabel')}</span>
              </h3>
              <p
                data-testid="summary-dialog-description"
                className="text-xs sm:text-sm text-[var(--hx-ink-2)] leading-relaxed"
              >
                {description}
              </p>
            </section>
          )}

          {/* Key Ideas / Points */}
          <section className="space-y-2">
            <h3
              id="txtModalIdeasTitle"
              className="flex items-center gap-1.5 font-serif text-sm font-bold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
            >
              <HeritageIcon name="summary" size={14} />
              <span>{t('txtModalIdeasTitle')}</span>
            </h3>

            <ul
              id="summaryKeyPoints"
              data-testid="summary-dialog-keypoints"
              className="hx-dialog-section space-y-2.5 p-4 text-xs sm:text-sm text-[var(--hx-ink-2)]"
            >
              {keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 shrink-0 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                  >
                    <HeritageIcon name="octagram" size={11} />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Target Audience (only when available in record) */}
          {targetAudience && (
            <section className="hx-dialog-section p-4 space-y-1.5">
              <h3
                id="txtModalAudienceTitle"
                className="flex items-center gap-1.5 font-serif text-sm font-bold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
              >
                <HeritageIcon name="users" size={14} />
                <span>{t('txtModalAudienceTitle')}</span>
              </h3>
              <p
                id="summaryAudience"
                data-testid="summary-dialog-audience"
                className="text-xs sm:text-sm text-[var(--hx-ink-2)] leading-relaxed"
              >
                {targetAudience}
              </p>
            </section>
          )}

          {/* APA Academic Citation Box */}
          <section className="rounded-[12px] border border-[rgba(201,153,46,0.42)] bg-[var(--hx-surface-2)] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="txtModalApaTitle"
                className="flex items-center gap-1.5 font-serif text-sm font-bold text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
              >
                <HeritageIcon name="quote" size={14} />
                <span>{t('txtModalApaTitle')}</span>
              </h3>

              <button
                type="button"
                data-testid="summary-copy-apa-btn"
                onClick={handleCopyApaClick}
                className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs gap-1.5"
              >
                <HeritageIcon name={copiedApa ? 'check' : 'copy'} size={13} />
                <span>{copiedApa ? t('copiedToClipboard') : t('cite')}</span>
              </button>
            </div>

            <pre
              id="summaryAPA"
              dir="auto"
              data-testid="summary-dialog-apa"
              className="whitespace-pre-wrap break-words rounded-[10px] border border-[var(--hx-line)] bg-[var(--hx-surface)] p-3 font-sans text-xs text-[var(--hx-ink)] leading-relaxed"
            >
              {apaText}
            </pre>
          </section>
        </div>

        {/* Dialog Footer Actions */}
        <footer className="hx-dialog-footer flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="summary-open-details-btn"
              onClick={() => {
                onOpenChange(false);
                onOpenFullDetails(book);
              }}
              className="hx-btn hx-btn-solid hx-btn-sm gap-1.5"
            >
              <span>{translate('صفحة المرجع الكاملة', 'Full reference page')}</span>
              <DetailsArrowIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </button>

            {hasFile && (
              <button
                type="button"
                data-testid="summary-read-btn"
                onClick={() => {
                  onOpenChange(false);
                  onRead(book);
                }}
                className="hx-btn hx-btn-line hx-btn-sm gap-1.5"
              >
                <HeritageIcon name="read" size={14} />
                <span>{t('read')}</span>
              </button>
            )}

            <button
              type="button"
              id="modalShareBtn"
              data-testid="summary-share-btn"
              onClick={() => onShare(book)}
              className="hx-btn hx-btn-line hx-btn-sm gap-1.5"
            >
              <HeritageIcon name="share" size={14} />
              <span id="txtShareModalBtn">{t('txtShareModalBtn')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="hx-btn hx-btn-line hx-btn-sm"
          >
            <span id="txtModalClose">{t('txtModalClose')}</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
