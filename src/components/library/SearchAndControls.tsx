import { ArrowUpDown, Heart, LayoutGrid, List, RotateCcw, X } from 'lucide-react';
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
  hasExternalFilters?: boolean;
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
 * Sovereign Catalog Controls Dock (Single unified bar).
 * Displays archival catalog metrics, active search indicator,
 * sorting options, favorites toggle, and grid/list view switcher.
 * (Redundant middle search input removed per sovereign aesthetic guidelines).
 */
export function SearchAndControls({
  query,
  category,
  sort,
  viewMode,
  favoritesOnly,
  hasExternalFilters = false,
  totalMatching,
  onClearSearch,
  onSortChange,
  onViewModeChange,
  onToggleFavoritesOnly,
  onResetFilters
}: SearchAndControlsProps) {
  const { t, translate, formatNumber } = useI18n();

  const hasActiveFilters =
    Boolean(query) ||
    category !== ALL_CATEGORIES_KEY ||
    favoritesOnly ||
    hasExternalFilters;

  return (
    <section
      id="controlsRow"
      aria-label={t('searchLabel')}
      data-testid="search-and-controls"
      className="hx-panel hx-panel--dock mb-5 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      {/* Right side (RTL) / Start: Library status, results count & active search badge */}
      <div className="hx-lib-meta flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="hx-lib-title" id="txtLibraryTitle">
            {t('txtLibraryTitle')}
          </span>
          <span className="opacity-50">/</span>
          <span>
            {translate('يتم عرض', 'Displaying')}{' '}
            <strong data-testid="results-counter" className="hx-num">
              {formatNumber(totalMatching)}
            </strong>{' '}
            {translate('مرجعاً إدارياً', 'references')}
          </span>
        </div>

        {/* Active Search Filter Pill */}
        {query && (
          <span className="hx-tagpill">
            <span>&ldquo;{query}&rdquo;</span>
            <button
              type="button"
              onClick={onClearSearch}
              className="hover:text-destructive cursor-pointer ms-0.5"
              aria-label={t('clearSearchAria')}
              title={t('clearSearchAria')}
            >
              <X className="size-3" />
            </button>
          </span>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            data-testid="controls-reset-filters"
            onClick={onResetFilters}
            className="hx-linkbtn"
          >
            <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
            <span>{t('resetFilters')}</span>
          </button>
        )}
      </div>

      {/* Left side (RTL) / End: Controls (Sort + Favorites + View Mode Switcher) */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
        {/* Sort Selector Dropdown */}
        <div className="hx-ctl-select flex-1 sm:flex-initial min-w-[135px] sm:w-[200px]">
          <ArrowUpDown aria-hidden="true" />
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
        <button
          type="button"
          data-testid="controls-favorites-btn"
          aria-pressed={favoritesOnly}
          aria-label={translate('تصفية المفضلة فقط', 'Filter favorites only')}
          title={t('txtFavoritesOnly')}
          onClick={onToggleFavoritesOnly}
          className="hx-ctl shrink-0"
        >
          <Heart className={cn(favoritesOnly && 'fill-current')} aria-hidden="true" />
          <span className="hidden sm:inline">{t('txtFavoritesOnly')}</span>
        </button>

        {/* View Mode Segmented Control */}
        <div
          role="group"
          aria-label={translate('نمط العرض', 'View mode')}
          className="hx-seg shrink-0"
        >
          <button
            type="button"
            id="btnViewGrid"
            data-testid="view-grid-btn"
            aria-label={t('viewGridAria')}
            aria-pressed={viewMode === 'grid'}
            title={t('viewGridAria')}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid aria-hidden="true" />
          </button>

          <button
            type="button"
            id="btnViewList"
            data-testid="view-list-btn"
            aria-label={t('viewListAria')}
            aria-pressed={viewMode === 'list'}
            title={t('viewListAria')}
            onClick={() => onViewModeChange('list')}
          >
            <List aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
