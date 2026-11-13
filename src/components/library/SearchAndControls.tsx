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
 * Heritage Catalog Controls Dock (Single unified bar).
 * Displays archival catalog metrics, active search indicator,
 * sorting options, favorites toggle, and grid/list view switcher.
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
      className="hx-panel mb-5 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      {/* Right side (RTL) / Start: Library status, results count & active search badge */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--hx-muted)] w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span
            className="font-serif font-bold text-lg text-[var(--hx-ink)]"
            id="txtLibraryTitle"
          >
            {t('txtLibraryTitle')}
          </span>
          <span className="text-[var(--hx-line-2)]">/</span>
          <span>
            {translate('يتم عرض', 'Displaying')}{' '}
            <strong
              data-testid="results-counter"
              className="text-[var(--hx-ink)] font-mono font-semibold tabular-nums"
            >
              {formatNumber(totalMatching)}
            </strong>{' '}
            {translate('مرجعاً إدارياً', 'references')}
          </span>
        </div>

        {/* Active Search Filter Pill */}
        {query && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--hx-chip-on-bg)] text-[var(--hx-chip-on-ink)] text-[11px] font-semibold">
            <span>&ldquo;{query}&rdquo;</span>
            <button
              type="button"
              onClick={onClearSearch}
              className="hover:opacity-75 cursor-pointer ms-0.5"
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
            className="inline-flex items-center gap-1 text-xs text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] hover:underline font-semibold h-7 px-2 rounded-full cursor-pointer"
          >
            <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
            <span>{t('resetFilters')}</span>
          </button>
        )}
      </div>

      {/* Left side (RTL) / End: Controls (Sort + Favorites + View Mode Switcher) */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
        {/* Sort Selector Dropdown */}
        <div className="relative flex-1 sm:flex-initial min-w-[140px] sm:w-[190px]">
          <ArrowUpDown
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-3.5 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
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
            className="hx-select-field h-9.5 w-full ps-8 pe-3 text-xs font-semibold cursor-pointer"
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
          className="hx-pill-toggle !min-h-9.5 !px-3 shrink-0 cursor-pointer"
        >
          <Heart
            className={cn(
              'size-3.5',
              favoritesOnly
                ? 'fill-current'
                : 'text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
            )}
            aria-hidden="true"
          />
          <span className="hidden sm:inline text-xs">{t('txtFavoritesOnly')}</span>
        </button>

        {/* View Mode Segmented Control */}
        <div
          role="group"
          aria-label={translate('نمط العرض', 'View mode')}
          className="hx-segmented shrink-0"
        >
          <button
            type="button"
            id="btnViewGrid"
            data-testid="view-grid-btn"
            aria-label={t('viewGridAria')}
            aria-pressed={viewMode === 'grid'}
            title={t('viewGridAria')}
            onClick={() => onViewModeChange('grid')}
            className="hx-segmented-btn text-xs cursor-pointer"
          >
            <LayoutGrid className="size-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            id="btnViewList"
            data-testid="view-list-btn"
            aria-label={t('viewListAria')}
            aria-pressed={viewMode === 'list'}
            title={t('viewListAria')}
            onClick={() => onViewModeChange('list')}
            className="hx-segmented-btn text-xs cursor-pointer"
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
