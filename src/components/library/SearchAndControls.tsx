import { ArrowUpDown, Heart, LayoutGrid, List, RotateCcw, X } from 'lucide-react';
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
  totalMatching,
  onClearSearch,
  onSortChange,
  onViewModeChange,
  onToggleFavoritesOnly,
  onResetFilters
}: SearchAndControlsProps) {
  const { t, translate, formatNumber } = useI18n();

  const hasActiveFilters =
    Boolean(query) || category !== ALL_CATEGORIES_KEY || favoritesOnly;

  return (
    <section
      id="controlsRow"
      aria-label={t('searchLabel')}
      data-testid="search-and-controls"
      className="mb-5 bg-card p-3 sm:p-4 rounded-[4px] border hairline-border-strong doc-shadow flex flex-col sm:flex-row items-center justify-between gap-3"
    >
      {/* Right side (RTL) / Start: Library status, results count & active search badge */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span
            className="font-serif font-bold text-base text-foreground"
            id="txtLibraryTitle"
          >
            {t('txtLibraryTitle')}
          </span>
          <span className="opacity-50">/</span>
          <span>
            {translate('يتم عرض', 'Displaying')}{' '}
            <strong
              data-testid="results-counter"
              className="text-foreground font-mono font-semibold tabular-nums"
            >
              {formatNumber(totalMatching)}
            </strong>{' '}
            {translate('مرجعاً إدارياً', 'references')}
          </span>
        </div>

        {/* Active Search Filter Pill */}
        {query && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] bg-primary/10 text-primary border border-primary/35 text-[11px] font-medium">
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
          <Button
            type="button"
            variant="ghost"
            size="xs"
            data-testid="controls-reset-filters"
            onClick={onResetFilters}
            className="text-xs text-primary hover:text-primary/80 font-semibold h-6 px-2 rounded-[3px]"
          >
            <RotateCcw className="size-3 shrink-0" aria-hidden="true" />
            <span>{t('resetFilters')}</span>
          </Button>
        )}
      </div>

      {/* Left side (RTL) / End: Controls (Sort + Favorites + View Mode Switcher) */}
      <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
        {/* Sort Selector Dropdown */}
        <div className="relative flex-1 sm:flex-initial min-w-[135px] sm:w-[185px]">
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
            className="h-9 w-full rounded-[3px] border hairline-border-strong bg-background/80 ps-8 pe-3 text-xs font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring cursor-pointer"
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
          className={cn(
            'h-9 px-2.5 rounded-[3px] border shrink-0 transition-colors cursor-pointer',
            favoritesOnly
              ? 'bg-primary text-primary-foreground font-semibold border-primary'
              : 'hairline-border-strong bg-background/80 text-foreground hover:bg-secondary'
          )}
        >
          <Heart
            className={cn('size-3.5', favoritesOnly && 'fill-current')}
            aria-hidden="true"
          />
          <span className="hidden sm:inline text-xs">{t('txtFavoritesOnly')}</span>
        </Button>

        {/* View Mode Segmented Control */}
        <div
          role="group"
          aria-label={translate('نمط العرض', 'View mode')}
          className="inline-flex items-center rounded-[3px] border hairline-border-strong bg-background/80 p-0.5 shrink-0 h-9"
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
              'inline-flex size-7.5 items-center justify-center rounded-[2px] text-xs transition-colors cursor-pointer',
              viewMode === 'grid'
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
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
            className={cn(
              'inline-flex size-7.5 items-center justify-center rounded-[2px] text-xs transition-colors cursor-pointer',
              viewMode === 'list'
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <List className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
