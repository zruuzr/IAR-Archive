import {
  BookOpen,
  Calendar,
  Download,
  FileText,
  Heart,
  Layers,
  Quote,
  Share2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildBookUrl } from '@/hooks/useBundle';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface FeaturedSpotlightProps {
  book: Book | null;
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
 * Editorial "In the Spotlight" featured reference card.
 * Rendered only in the default unfiltered view on Page 1 (`catalogResult.spotlightBook`),
 * and automatically excluded from the main grid by `queryCatalog`.
 */
export function FeaturedSpotlight({
  book,
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
}: FeaturedSpotlightProps) {
  const { lang, t, getBookField, formatNumber } = useI18n();

  if (!book) {
    return null;
  }

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const badgeText = getBookField(book, 'badge_text') || t('inTheSpotlight');
  const category = getCategoryLabel(book, lang);
  const hasFile = Boolean(book.file_path);

  return (
    <section
      id="featuredSection"
      aria-label={t('inTheSpotlight')}
      data-testid="featured-spotlight"
      className="mb-8"
    >
      <article
        data-testid={`spotlight-card-${book.id}`}
        className="relative overflow-hidden rounded-2xl border border-primary/35 bg-card text-card-foreground shadow-sm"
      >
        {/* Subtle top bronze editorial rule */}
        <div
          aria-hidden="true"
          className="h-1 w-full bg-gradient-to-r from-primary/70 via-teal/60 to-primary/30"
        />

        <div className="p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start lg:gap-8">
            {/* Featured Book Cover */}
            <div className="flex justify-center md:justify-start shrink-0">
              <BookCover
                book={book}
                featured
                onClick={() => (onZoomCover ?? onOpenDetails)(book)}
                className="w-36 sm:w-44 md:w-48 shadow-md"
              />
            </div>

            {/* Editorial Copy & Actions */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Top Meta Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{badgeText}</span>
                  </span>

                  <span className="inline-flex items-center rounded-md border border-border bg-secondary/70 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                    {category}
                  </span>
                </div>

                <span className="text-[11px] font-mono tracking-wider text-muted-foreground uppercase">
                  01 / IAR SELECTION
                </span>
              </div>

              {/* Title & Author */}
              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  <a
                    href={buildBookUrl(book.id)}
                    data-testid={`spotlight-title-link-${book.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenDetails(book);
                    }}
                    className="hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xs"
                  >
                    {title}
                  </a>
                </h2>

                {author && (
                  <p className="text-sm font-medium text-muted-foreground">{author}</p>
                )}
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm sm:text-[15px] text-foreground/85 leading-relaxed line-clamp-3 max-w-[70ch]">
                  {description}
                </p>
              )}

              {/* Metadata Chips & Interactive Star Rating */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {book.year && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 font-medium">
                    <Calendar
                      className="size-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span>{book.year}</span>
                  </span>
                )}

                {book.pages && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1 font-medium">
                    <FileText
                      className="size-3.5 text-teal shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {book.pages} {t('pagesUnit')}
                    </span>
                  </span>
                )}

                <RatingStars book={book} onRate={onRate} size="sm" />
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/70">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!hasFile || isDownloadBusy}
                  data-testid={`spotlight-download-${book.id}`}
                  onClick={() => onDownload(book)}
                  className="gap-1.5"
                >
                  <Download className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('download')}</span>
                  {book.downloadCount > 0 && (
                    <span
                      data-download-count={book.id}
                      className="ms-0.5 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[11px] font-semibold tabular-nums"
                    >
                      {formatNumber(book.downloadCount)}
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!hasFile}
                  data-testid={`spotlight-read-${book.id}`}
                  onClick={() => onRead(book)}
                  className="gap-1.5"
                >
                  <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('read')}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid={`spotlight-summary-${book.id}`}
                  onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
                  className="gap-1.5"
                >
                  <Sparkles
                    className="size-3.5 text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <span>{t('summary')}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid={`spotlight-cite-${book.id}`}
                  onClick={() => onCopyCitation(book)}
                  aria-label={t('cite')}
                  title={t('cite')}
                  className="gap-1.5"
                >
                  <Quote className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('cite')}</span>
                </Button>

                {onShare && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`spotlight-share-${book.id}`}
                    onClick={() => onShare(book)}
                    aria-label={t('share')}
                    title={t('share')}
                    className="gap-1.5"
                  >
                    <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('share')}</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant={isInBundle ? 'secondary' : 'ghost'}
                  size="sm"
                  data-testid={`spotlight-bundle-${book.id}`}
                  aria-pressed={isInBundle}
                  aria-label={`${t('addToBundlePrefix')}${title}`}
                  onClick={() => onToggleBundle(book.id)}
                  className={cn(
                    'gap-1.5',
                    isInBundle && 'border border-primary/40 text-primary font-semibold'
                  )}
                >
                  <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('bundleCheckboxLabel')}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  data-testid={`spotlight-favorite-${book.id}`}
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
                  title={isFavorite ? t('removeFavorite') : t('addFavorite')}
                  onClick={() => onToggleFavorite(book.id)}
                  className={cn(isFavorite && 'text-destructive')}
                >
                  <Heart
                    className={cn('size-4', isFavorite && 'fill-current')}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
