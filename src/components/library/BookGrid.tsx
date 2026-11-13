import { AlertCircle, HeartOff, RotateCcw, SearchX } from 'lucide-react';
import { HeritageButton, HeritageFrieze, HeritageGrid } from '@/components/heritage';
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
              className={cn(
                'hx-panel p-5 animate-pulse min-h-[380px]',
                viewMode === 'list'
                  ? 'flex flex-col sm:flex-row gap-5 min-h-[200px]'
                  : 'flex flex-col justify-between space-y-4'
              )}
            >
              <div
                className={cn(
                  'mx-auto w-28 aspect-[5/7] rounded-[10px] bg-[var(--hx-surface-2)] shrink-0',
                  viewMode === 'list' && 'sm:mx-0 w-24'
                )}
              />
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="h-3.5 w-24 rounded-full bg-[var(--hx-surface-2)]" />
                  <div className="h-5 w-4/5 rounded-[8px] bg-[var(--hx-surface-2)]" />
                  <div className="h-3.5 w-1/2 rounded-[6px] bg-[var(--hx-surface-2)]" />
                  <div className="h-3 w-1/3 rounded-[6px] bg-[var(--hx-surface-2)]" />
                </div>
                <div className="h-9 w-full rounded-[10px] bg-[var(--hx-surface-2)]" />
              </div>
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
        className="hx-state-card max-w-xl mx-auto my-6 text-center hx-fade"
      >
        <HeritageFrieze />
        <div className="relative z-10 p-7 sm:p-9 space-y-4">
          <div className="mx-auto flex size-13 items-center justify-center rounded-full border border-destructive/35 bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--hx-ink)]">
              {t('errorLoadTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--hx-ink-2)] leading-relaxed">
              {errorMessage || t('errorLoadBody')}
            </p>
          </div>
          <div className="pt-1 flex justify-center">
            <HeritageButton
              variant="solid"
              size="sm"
              data-testid="catalog-retry-btn"
              onClick={onRetry}
            >
              <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t('retry')}</span>
            </HeritageButton>
          </div>
        </div>
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
        className="empty-state hx-state-card text-center max-w-xl mx-auto my-6 hx-fade"
      >
        <HeritageFrieze />
        <div className="relative z-10 p-7 sm:p-10 space-y-4">
          <div className="hx-state-seal">
            {isNoFavoritesYet ? (
              <HeartOff className="size-6" aria-hidden="true" />
            ) : (
              <SearchX className="size-6" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[var(--hx-ink)]">
              {isNoFavoritesYet
                ? translate(
                    'قائمة المفضلة فارغة حاليًا',
                    'Your favorites list is currently empty'
                  )
                : t('noMatchingReferencesTitle')}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--hx-ink-2)] leading-relaxed">
              {isNoFavoritesYet
                ? translate(
                    'أضف أي مرجع إلى المفضلة بالضغط على أيقونة القلب للوصول السريع إليه لاحقًا.',
                    'Save any reference to your favorites using the heart icon for quick access later.'
                  )
                : t('noMatchingReferencesBody')}
            </p>
          </div>

          <div className="pt-1 flex justify-center">
            <HeritageButton
              variant="solid"
              size="sm"
              data-testid="empty-reset-btn"
              onClick={onResetFilters}
            >
              <RotateCcw className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t('resetFilters')}</span>
            </HeritageButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="booksDisplayContainer" data-testid="books-display-container">
      <HeritageGrid
        testId="books-grid"
        data-view-mode={viewMode}
        list={viewMode === 'list'}
        className="mb-8"
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
      </HeritageGrid>
    </div>
  );
}
