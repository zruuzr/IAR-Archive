import {
  ArrowUpLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FileText,
  HardDrive,
  Quote,
  Share2,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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
      className="hx-modal"
    >
      {/* Backdrop click target */}
      <div
        data-testid="summary-dialog-backdrop"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0"
      />

      <div ref={dialogContainerRef} className="hx-modal-card max-w-2xl">
        {/* Dialog Header */}
        <header className="hx-modal-head">
          <div className="min-w-0">
            <div className="hx-eyebrow-ar">
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t('summaryModalTitle')}</span>
            </div>

            <h2
              id="summaryBookTitle"
              data-testid="summary-dialog-title"
              className="hx-modal-title"
            >
              {title}
            </h2>

            {author && (
              <p id="summaryBookAuthor" className="hx-modal-sub">
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
            className="hx-modal-x"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable Summary Content */}
        <div className="hx-modal-body">
          {/* Metadata Chips & Copy Summary Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hx-pills">
              <span id="summaryCategory" className="hx-pill hx-pill--teal">
                {category}
              </span>

              <span id="summaryType" className="hx-pill">
                {bookType}
              </span>

              {book.pages && book.pages !== '0' && (
                <span id="summaryPages" className="hx-pill">
                  <FileText aria-hidden="true" />
                  <span>
                    {book.pages} {t('pagesUnit')}
                  </span>
                </span>
              )}

              {book.file_size && (
                <span id="summarySize" className="hx-pill hx-pill--latin">
                  <HardDrive aria-hidden="true" />
                  <span>{book.file_size}</span>
                </span>
              )}
            </div>

            {(description || hasRealKeyPoints) && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                data-testid="summary-copy-summary-btn"
                onClick={handleCopySummaryClick}
                className="gap-1.5 shrink-0"
              >
                {copiedSummary ? (
                  <Check
                    className="size-3.5 text-[var(--hx-teal-text)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                <span>
                  {copiedSummary
                    ? t('copiedToClipboard')
                    : translate('نسخ الملخص', 'Copy summary')}
                </span>
              </Button>
            )}
          </div>

          {/* Reference Abstract / Description */}
          {description && (
            <div className="hx-note">
              <h3 className="hx-note-h">{t('singleDescLabel')}</h3>
              <p data-testid="summary-dialog-description">{description}</p>
            </div>
          )}

          {/* Key Ideas / Points */}
          <div className="hx-note">
            <h3 id="txtModalIdeasTitle" className="hx-note-h">
              <Sparkles aria-hidden="true" />
              <span>{t('txtModalIdeasTitle')}</span>
            </h3>

            <ul
              id="summaryKeyPoints"
              data-testid="summary-dialog-keypoints"
              className="hx-note-list"
            >
              {keyPoints.map((point, idx) => (
                <li key={idx}>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Target Audience (only when available in record) */}
          {targetAudience && (
            <div className="hx-note hx-note--teal">
              <h3 id="txtModalAudienceTitle" className="hx-note-h hx-note-h--teal">
                <Users aria-hidden="true" />
                <span>{t('txtModalAudienceTitle')}</span>
              </h3>
              <p id="summaryAudience" data-testid="summary-dialog-audience">
                {targetAudience}
              </p>
            </div>
          )}

          {/* APA Academic Citation Box */}
          <div className="hx-note hx-note--lapis">
            <div className="flex items-center justify-between gap-2">
              <h3 id="txtModalApaTitle" className="hx-note-h hx-note-h--lapis">
                <Quote aria-hidden="true" />
                <span>{t('txtModalApaTitle')}</span>
              </h3>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                data-testid="summary-copy-apa-btn"
                onClick={handleCopyApaClick}
                className="h-7 text-xs gap-1"
              >
                {copiedApa ? (
                  <Check
                    className="size-3.5 text-[var(--hx-teal-text)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
                <span>{copiedApa ? t('copiedToClipboard') : t('cite')}</span>
              </Button>
            </div>

            <pre
              id="summaryAPA"
              dir="auto"
              data-testid="summary-dialog-apa"
              className="hx-cite"
            >
              {apaText}
            </pre>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <footer className="hx-modal-foot">
          <div>
            <Button
              type="button"
              variant="default"
              size="sm"
              data-testid="summary-open-details-btn"
              onClick={() => {
                onOpenChange(false);
                onOpenFullDetails(book);
              }}
              className="gap-1.5"
            >
              <span>{translate('صفحة المرجع الكاملة', 'Full reference page')}</span>
              <DetailsArrowIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </Button>

            {hasFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="summary-read-btn"
                onClick={() => {
                  onOpenChange(false);
                  onRead(book);
                }}
                className="gap-1.5"
              >
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{t('read')}</span>
              </Button>
            )}

            <Button
              type="button"
              id="modalShareBtn"
              variant="ghost"
              size="sm"
              data-testid="summary-share-btn"
              onClick={() => onShare(book)}
              className="gap-1.5"
            >
              <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span id="txtShareModalBtn">{t('txtShareModalBtn')}</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <span id="txtModalClose">{t('txtModalClose')}</span>
          </Button>
        </footer>
      </div>
    </div>
  );
}
