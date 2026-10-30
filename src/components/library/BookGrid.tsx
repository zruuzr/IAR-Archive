import { AlertCircle, HeartOff, RotateCcw, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/hooks/useLibraryState';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';
import { BookCard } from './BookCard';

export interface BookGridProps {
  books: readonly Book[];
  loading: boolean;
  error: boolean;
  errorMessage?: string | null;
  viewMode: ViewMode;
  favoritesOnly: boolean;
  favoritesSet: ReadonlySet<number>;
  bundleSet: ReadonlySet<number>;
  isDownloadBusy: (bookId: number) => boolean;
  onRetry: () => void;
  onResetFilters: () => void;
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
 * Renders the main reference catalog grid/list view along with
 * accessible loading skeletons, catalog error recovery, and empty/no-favorites states.
 */
export function BookGrid({
  books,
  loading,
  error,
  errorMessage,
  viewMode,
  favoritesOnly,
  favoritesSet,
  bundleSet,
  isDownloadBusy,
  onRetry,
  onResetFilters,
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
}: BookGridProps) {
  const { t, translate } = useI18n();

  if (loading) {
    return (
      <div
        id="booksDisplayContainer"
        role="status"
        aria-live="polite"
        data-testid="catalog-loading-skeleton"
        className="space-y-4"
      >
        <p className="sr-only">{t('txtLoading')}</p>
        <div
          className={cn(
            'grid gap-5',
            viewMode === 'list'
              ? 'grid-cols-1'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
          )}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-[4px] border hairline-border-strong bg-card p-5 doc-shadow animate-pulse space-y-4 min-h-[380px]"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded-[2px] bg-secondary" />
                <div className="h-4 w-14 rounded-[2px] bg-secondary" />
              </div>
              <div className="mx-auto h-40 w-28 rounded-[3px] bg-secondary" />
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded-[2px] bg-secondary" />
                <div className="h-3.5 w-1/2 rounded-[2px] bg-secondary" />
                <div className="h-3 w-1/3 rounded-[2px] bg-secondary" />
              </div>
              <div className="h-8 w-full rounded-[3px] bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        id="booksDisplayContainer"
        role="alert"
        data-testid="catalog-error-state"
        className="rounded-[4px] border border-destructive/40 bg-card p-8 text-center doc-shadow max-w-xl mx-auto my-6 space-y-4"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-[4px] border border-destructive/30 bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
            {t('errorLoadTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {errorMessage || t('errorLoadBody')}
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          size="sm"
          data-testid="catalog-retry-btn"
          onClick={onRetry}
          className="gap-1.5 rounded-[3px]"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>{t('retry')}</span>
        </Button>
      </div>
    );
  }

  if (books.length === 0) {
    const isNoFavoritesYet = favoritesOnly && favoritesSet.size === 0;

    return (
      <div
        id="booksDisplayContainer"
        role="status"
        data-testid="catalog-empty-state"
        className="empty-state rounded-[4px] border hairline-border-strong bg-card p-8 sm:p-10 text-center doc-shadow max-w-xl mx-auto my-6 space-y-4"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-[4px] border hairline-border bg-secondary text-primary">
          {isNoFavoritesYet ? (
            <HeartOff className="size-6" aria-hidden="true" />
          ) : (
            <SearchX className="size-6" aria-hidden="true" />
          )}
        </div>

        <div className="space-y-1.5">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
            {isNoFavoritesYet
              ? translate(
                  'قائمة المفضلة فارغة حاليًا',
                  'Your favorites list is currently empty'
                )
              : t('noMatchingReferencesTitle')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isNoFavoritesYet
              ? translate(
                  'أضف أي مرجع إلى المفضلة بالضغط على أيقونة القلب للوصول السريع إليه لاحقًا.',
                  'Save any reference to your favorites using the heart icon for quick access later.'
                )
              : t('noMatchingReferencesBody')}
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          size="sm"
          data-testid="empty-reset-btn"
          onClick={onResetFilters}
          className="gap-1.5 rounded-[3px] bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          <span>{t('resetFilters')}</span>
        </Button>
      </div>
    );
  }

  return (
    <div id="booksDisplayContainer" data-testid="books-display-container">
      <div
        data-testid="books-grid"
        data-view-mode={viewMode}
        className={cn(
          'grid gap-4 sm:gap-5 items-stretch',
          viewMode === 'list'
            ? 'grid-cols-1'
            : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
        )}
      >
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            viewMode={viewMode}
            isFavorite={favoritesSet.has(book.id)}
            isInBundle={bundleSet.has(book.id)}
            isDownloadBusy={isDownloadBusy(book.id)}
            onRead={onRead}
            onDownload={onDownload}
            onToggleFavorite={onToggleFavorite}
            onToggleBundle={onToggleBundle}
            onCopyCitation={onCopyCitation}
            onOpenDetails={onOpenDetails}
            onOpenSummary={onOpenSummary}
            onZoomCover={onZoomCover}
            onShare={onShare}
            onRate={onRate}
          />
        ))}
      </div>
    </div>
  );
}
