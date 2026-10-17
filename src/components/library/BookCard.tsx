import {
  BookOpen,
  Calendar,
  Check,
  Download,
  FileText,
  Heart,
  Layers,
  Quote,
  Share2,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildBookUrl } from '@/hooks/useBundle';
import type { ViewMode } from '@/hooks/useLibraryState';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface BookCardProps {
  book: Book;
  viewMode: ViewMode;
  isFavorite: boolean;
  isInBundle: boolean;
  isDownloadBusy?: boolean;
  onRead: (book: Book) => void;
  onDownload: (book: Book) => void;
  onToggleFavorite: (bookId: number) => void;
  onToggleBundle: (bookId: number) => void;
  onCopyCitation: (book: Book) => void;
  onOpenDetails: (book: Book) => void;
  onOpenSummary?: (book: Book) => void;
  onZoomCover?: (book: Book) => void;
  onShare?: (book: Book) => void;
  onRate?: (bookId: number, stars: number) => void;
}

/**
 * Clean academic editorial reference card for the main library grid and list views.
 * Displays cover (click to zoom), title (click to open details page), author, category,
 * year/pages, interactive 1-5 star ratings, and wired actions (Download, Read,
 * 3-Minute Summary Modal, Copy APA Citation, Share, Favorite, Research Bundle).
 */
export function BookCard({
  book,
  viewMode,
  isFavorite,
  isInBundle,
  isDownloadBusy = false,
  onRead,
  onDownload,
  onToggleFavorite,
  onToggleBundle,
  onCopyCitation,
  onOpenDetails,
  onOpenSummary,
  onZoomCover,
  onShare,
  onRate
}: BookCardProps) {
  const { lang, t, getBookField, formatNumber } = useI18n();
  const [citedRecently, setCitedRecently] = useState<boolean>(false);

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const category = getCategoryLabel(book, lang);
  const hasFile = Boolean(book.file_path);

  const handleCiteClick = () => {
    onCopyCitation(book);
    setCitedRecently(true);
    setTimeout(() => {
      setCitedRecently(false);
    }, 1800);
  };

  return (
    <article
      data-testid={`book-card-${book.id}`}
      data-book-id={book.id}
      className={cn(
        'book-card group flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 text-card-foreground shadow-2xs transition-colors hover:border-primary/45',
        viewMode === 'list' && 'sm:flex-row sm:items-start sm:gap-5'
      )}
    >
      <div className={cn('flex-1 min-w-0 space-y-3.5')}>
        {/* Topline: Reference Type Badge & Bundle Toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground truncate max-w-[65%]">
            {bookType}
          </span>

          <button
            type="button"
            data-testid={`book-bundle-btn-${book.id}`}
            aria-pressed={isInBundle}
            aria-label={`${t('addToBundlePrefix')}${title}`}
            onClick={() => onToggleBundle(book.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ring',
              isInBundle
                ? 'border-primary bg-primary/15 text-primary font-semibold'
                : 'border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            <Layers className="size-3 shrink-0" aria-hidden="true" />
            <span>{t('bundleCheckboxLabel')}</span>
          </button>
        </div>

        {/* Main Identity: Cover + Bibliographic Metadata */}
        <div className="flex items-start gap-3.5 sm:gap-4">
          <BookCover
            book={book}
            onClick={() => (onZoomCover ?? onOpenDetails)(book)}
            className="w-22 sm:w-26 shrink-0"
          />

          <div className="flex-1 min-w-0 space-y-1.5">
            <span className="inline-block rounded-sm bg-teal/12 px-2 py-0.5 text-[11px] font-semibold text-teal truncate max-w-full">
              {category}
            </span>

            <h3 className="book-title text-[15px] sm:text-base font-bold leading-snug text-foreground line-clamp-2">
              <a
                href={buildBookUrl(book.id)}
                data-testid={`book-title-link-${book.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDetails(book);
                }}
                className="hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xs"
              >
                {title}
              </a>
            </h3>

            {author && (
              <p
                data-testid={`book-author-${book.id}`}
                className="text-xs font-medium text-muted-foreground truncate"
              >
                {author}
              </p>
            )}

            {/* Year & Pages Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              {book.year && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-secondary/60 px-1.5 py-0.5 font-mono tabular-nums">
                  <Calendar className="size-3 text-primary shrink-0" aria-hidden="true" />
                  <span>{book.year}</span>
                </span>
              )}

              {book.pages && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-secondary/60 px-1.5 py-0.5 tabular-nums">
                  <FileText className="size-3 text-teal shrink-0" aria-hidden="true" />
                  <span>
                    {book.pages} {t('pagesUnit')}
                  </span>
                </span>
              )}
            </div>

            {/* Interactive Star Rating */}
            <div className="pt-0.5">
              <RatingStars book={book} onRate={onRate} size="sm" />
            </div>
          </div>
        </div>

        {/* Concise Description */}
        {description && (
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div
        className={cn(
          'mt-4 flex flex-wrap items-center justify-between gap-1.5 border-t border-border/70 pt-3',
          viewMode === 'list' &&
            'sm:mt-0 sm:border-t-0 sm:border-s sm:ps-4 sm:pt-0 sm:flex-col sm:items-stretch sm:justify-center sm:w-44 shrink-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <Button
            type="button"
            variant="default"
            size="xs"
            disabled={!hasFile || isDownloadBusy}
            data-testid={`book-download-btn-${book.id}`}
            aria-label={t('download')}
            onClick={() => onDownload(book)}
            className="h-8 px-2.5 text-xs font-semibold gap-1"
          >
            <Download className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{t('download')}</span>
            {book.downloadCount > 0 && (
              <span
                data-download-count={book.id}
                className="rounded-full bg-primary-foreground/20 px-1.5 text-[10px] tabular-nums"
              >
                {formatNumber(book.downloadCount)}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!hasFile}
            data-testid={`book-read-btn-${book.id}`}
            aria-label={t('read')}
            onClick={() => onRead(book)}
            className="h-8 px-2.5 text-xs font-medium gap-1"
          >
            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{t('read')}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            data-testid={`book-summary-btn-${book.id}`}
            aria-label={t('summary')}
            title={t('summary')}
            onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Sparkles className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('summary')}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            data-testid={`book-cite-btn-${book.id}`}
            aria-label={t('cite')}
            title={t('cite')}
            onClick={handleCiteClick}
            className={cn('size-8', citedRecently && 'text-primary bg-primary/10')}
          >
            {citedRecently ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <Quote className="size-3.5" aria-hidden="true" />
            )}
          </Button>

          {onShare && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              data-testid={`book-share-btn-${book.id}`}
              aria-label={t('share')}
              title={t('share')}
              onClick={() => onShare(book)}
              className="size-8"
            >
              <Share2 className="size-3.5" aria-hidden="true" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            data-testid={`book-favorite-btn-${book.id}`}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
            title={isFavorite ? t('removeFavorite') : t('addFavorite')}
            onClick={() => onToggleFavorite(book.id)}
            className={cn('size-8', isFavorite && 'text-destructive')}
          >
            <Heart
              className={cn('size-3.5', isFavorite && 'fill-current')}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>
    </article>
  );
}
