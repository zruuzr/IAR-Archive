import { ArrowUpDown, Heart, LayoutGrid, List, RotateCcw, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ViewMode } from '@/hooks/useLibraryState';
import { useI18n } from '@/i18n/I18nProvider';
import { ALL_CATEGORIES_KEY } from '@/lib/catalog-query';
import { cn } from '@/lib/utils';
import type { SortOrder } from '@/types/book';

export interface SearchAndControlsProps {
  query: string;
  category: string;
  sort: SortOrder;
  viewMode: ViewMode;
  favoritesOnly: boolean;
  totalMatching: number;
  onQueryChange: (nextQuery: string) => void;
  onClearSearch: () => void;
  onSortChange: (nextSort: SortOrder) => void;
  onViewModeChange: (nextView: ViewMode) => void;
  onToggleFavoritesOnly: () => void;
  onResetFilters: () => void;
}

const VALID_SORT_ORDERS: readonly SortOrder[] = [
  'default',
  'title',
  'year',
  'pages',
  'downloads',
  'favorites',
  'rating'
] as const;

/**
 * Search bar, sort selector, view mode switcher (Grid/List), favorites toggle,
 * and active filter status bar for the main library interface.
 */
export function SearchAndControls({
  query,
  category,
  sort,
  viewMode,
  favoritesOnly,
  totalMatching,
  onQueryChange,
  onClearSearch,
  onSortChange,
  onViewModeChange,
  onToggleFavoritesOnly,
  onResetFilters
}: SearchAndControlsProps) {
  const { t, translate, formatNumber } = useI18n();
  const [draftQuery, setDraftQuery] = useState<string>(query);

  // Preserve spaces while typing, while automatically syncing if query is cleared/reset externally
  const inputValue = draftQuery.trim() === query ? draftQuery : query;

  const hasActiveFilters =
    Boolean(query) || category !== ALL_CATEGORIES_KEY || favoritesOnly;

  return (
    <section
      id="controlsRow"
      aria-label={t('searchLabel')}
      data-testid="search-and-controls"
      className="mb-5 space-y-3"
    >
      {/* Section Header & Results Counter */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h2
            id="txtLibraryTitle"
            className="text-lg sm:text-xl font-bold tracking-tight text-foreground"
          >
            {t('txtLibraryTitle')}
          </h2>
          <span
            data-testid="results-counter"
            className="inline-flex items-center rounded-full border border-border bg-secondary/75 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground"
          >
            {formatNumber(totalMatching)}
          </span>
        </div>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            data-testid="controls-reset-filters"
            onClick={() => {
              setDraftQuery('');
              onResetFilters();
            }}
            className="text-xs text-primary hover:text-primary"
          >
            <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
            <span>{t('resetFilters')}</span>
          </Button>
        )}
      </div>

      {/* Main Search & Control Bar */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12 md:items-center rounded-xl border border-border bg-card p-3 shadow-2xs">
        {/* Search Input */}
        <div className="relative md:col-span-6 lg:col-span-7">
          <label htmlFor="searchInput" className="sr-only">
            {t('searchLabel')}
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="searchInput"
            type="search"
            value={inputValue}
            onChange={(e) => {
              const next = e.target.value;
              setDraftQuery(next);
              onQueryChange(next);
            }}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchLabel')}
            data-testid="search-input"
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-9 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring transition-colors"
          />
          {inputValue.length > 0 && (
            <button
              type="button"
              id="btnClearSearch"
              aria-label={t('clearSearchAria')}
              title={t('clearSearchAria')}
              data-testid="clear-search-btn"
              onClick={() => {
                setDraftQuery('');
                onClearSearch();
              }}
              className="absolute top-1/2 -translate-y-1/2 end-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Sort Selector + View Mode & Favorites Toggles */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-2 md:col-span-6 lg:col-span-5">
          {/* Sort Dropdown */}
          <div className="relative flex-1 min-w-[150px] sm:max-w-[230px]">
            <ArrowUpDown
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-2.5 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <select
              id="sortOrder"
              value={sort}
              onChange={(e) => {
                const value = e.target.value as SortOrder;
                if (VALID_SORT_ORDERS.includes(value)) {
                  onSortChange(value);
                }
              }}
              aria-label={t('sortOrderAria')}
              data-testid="sort-select"
              className="h-10 w-full rounded-lg border border-input bg-background ps-8 pe-3 text-xs sm:text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
            >
              <option id="optSortDefault" value="default">
                {t('optSortDefault')}
              </option>
              <option id="optSortTitle" value="title">
                {t('optSortTitle')}
              </option>
              <option id="optSortYear" value="year">
                {t('optSortYear')}
              </option>
              <option id="optSortPages" value="pages">
                {t('optSortPages')}
              </option>
              <option id="optSortDownloads" value="downloads">
                {t('optSortDownloads')}
              </option>
              <option id="optSortFavorites" value="favorites">
                {t('optSortFavorites')}
              </option>
              <option id="optSortRating" value="rating">
                {t('optSortRating')}
              </option>
            </select>
          </div>

          {/* Favorites Quick Filter Button */}
          <Button
            type="button"
            variant={favoritesOnly ? 'default' : 'outline'}
            size="sm"
            data-testid="controls-favorites-btn"
            aria-pressed={favoritesOnly}
            aria-label={translate('تصفية المفضلة فقط', 'Filter favorites only')}
            title={t('txtFavoritesOnly')}
            onClick={onToggleFavoritesOnly}
            className="h-10 px-2.5 shrink-0"
          >
            <Heart
              className={cn('size-4', favoritesOnly && 'fill-current')}
              aria-hidden="true"
            />
            <span className="sr-only">{t('txtFavoritesOnly')}</span>
          </Button>

          {/* View Mode Segmented Control */}
          <div
            role="group"
            aria-label={translate('نمط العرض', 'View mode')}
            className="inline-flex items-center rounded-lg border border-border bg-background p-0.5 shrink-0 h-10"
          >
            <button
              type="button"
              id="btnViewGrid"
              data-testid="view-grid-btn"
              aria-label={t('viewGridAria')}
              aria-pressed={viewMode === 'grid'}
              title={t('viewGridAria')}
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'inline-flex size-8.5 items-center justify-center rounded-md text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              id="btnViewList"
              data-testid="view-list-btn"
              aria-label={t('viewListAria')}
              aria-pressed={viewMode === 'list'}
              title={t('viewListAria')}
              onClick={() => onViewModeChange('list')}
              className={cn(
                'inline-flex size-8.5 items-center justify-center rounded-md text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
