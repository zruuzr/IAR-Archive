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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs"
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
        className="relative z-10 flex flex-col w-full max-w-2xl max-h-[90dvh] rounded-[4px] border hairline-border-strong bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        {/* Top Burnt-Terracotta Editorial Rule */}
        <div aria-hidden="true" className="h-[2px] w-full bg-primary shrink-0" />

        {/* Dialog Header */}
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b hairline-border bg-card shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] font-semibold text-primary">
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t('summaryModalTitle')}</span>
            </div>

            <h2
              id="summaryBookTitle"
              data-testid="summary-dialog-title"
              className="font-serif text-lg sm:text-xl font-bold text-foreground leading-snug"
            >
              {title}
            </h2>

            {author && (
              <p
                id="summaryBookAuthor"
                className="text-xs sm:text-sm font-medium text-muted-foreground"
              >
                {author}
              </p>
            )}
          </div>

          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            data-testid="summary-close-btn"
            aria-label={t('txtModalClose')}
            onClick={() => onOpenChange(false)}
            className="shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </header>

        {/* Scrollable Summary Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Metadata Chips & Copy Summary Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span
                id="summaryCategory"
                className="rounded-md bg-teal/12 px-2.5 py-0.5 font-semibold text-teal"
              >
                {category}
              </span>

              <span
                id="summaryType"
                className="rounded-md border border-border bg-secondary/70 px-2.5 py-0.5 font-medium text-secondary-foreground"
              >
                {bookType}
              </span>

              {book.pages && (
                <span
                  id="summaryPages"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 text-muted-foreground tabular-nums"
                >
                  <FileText className="size-3 text-teal shrink-0" aria-hidden="true" />
                  <span>
                    {book.pages} {t('pagesUnit')}
                  </span>
                </span>
              )}

              {book.file_size && (
                <span
                  id="summarySize"
                  className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 font-mono text-muted-foreground tabular-nums"
                >
                  <HardDrive className="size-3 shrink-0" aria-hidden="true" />
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
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
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
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                {t('singleDescLabel')}
              </h3>
              <p
                data-testid="summary-dialog-description"
                className="text-xs sm:text-sm text-foreground/90 leading-relaxed"
              >
                {description}
              </p>
            </div>
          )}

          {/* Key Ideas / Points */}
          <div className="space-y-2">
            <h3
              id="txtModalIdeasTitle"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary"
            >
              <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t('txtModalIdeasTitle')}</span>
            </h3>

            <ul
              id="summaryKeyPoints"
              data-testid="summary-dialog-keypoints"
              className="space-y-2 rounded-xl border border-border/80 bg-background/60 p-4 text-xs sm:text-sm text-foreground/90"
            >
              {keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Target Audience (only when available in record) */}
          {targetAudience && (
            <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-1">
              <h3
                id="txtModalAudienceTitle"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal"
              >
                <Users className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{t('txtModalAudienceTitle')}</span>
              </h3>
              <p
                id="summaryAudience"
                data-testid="summary-dialog-audience"
                className="text-xs sm:text-sm text-foreground/85 leading-relaxed"
              >
                {targetAudience}
              </p>
            </div>
          )}

          {/* APA Academic Citation Box */}
          <div className="rounded-xl border border-primary/30 bg-secondary/45 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="txtModalApaTitle"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground"
              >
                <Quote className="size-3.5 text-primary shrink-0" aria-hidden="true" />
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
                  <Check className="size-3.5 text-primary" aria-hidden="true" />
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
              className="whitespace-pre-wrap break-words rounded-lg border border-border/80 bg-card p-3 font-mono text-xs text-foreground/90 leading-relaxed"
            >
              {apaText}
            </pre>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t border-border bg-secondary/35 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
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
