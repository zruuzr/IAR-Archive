import { Check, ChevronDown, Compass, Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { normalizeSearchText } from '@/lib/arabic-search';
import { ALL_CATEGORIES_KEY } from '@/lib/catalog-query';
import { cn } from '@/lib/utils';
import { getCategoryKey } from '@/services/catalog';
import type { Book, CategoryOption } from '@/types/book';

export interface CategoryPathwaysProps {
  books: readonly Book[];
  categories: readonly CategoryOption[];
  activeCategory: string;
  onSelectCategory: (categoryKey: string) => void;
  quickPathwaysLimit?: number;
}

export interface CategoryWithCount extends CategoryOption {
  count: number;
}

/**
 * Solves the 114-category navigation problem without modifying `books.json`:
 * 1. Displays "All references" + the top highest-density categories as quick pathways with book counts.
 * 2. Always highlights the active category (even if outside the top quick pathways) with a 1-click clear button.
 * 3. Provides a searchable "All Categories" directory displaying all 114 categories with their exact book counts.
 */
export function CategoryPathways({
  books,
  categories,
  activeCategory,
  onSelectCategory,
  quickPathwaysLimit = 8
}: CategoryPathwaysProps) {
  const { lang, t, translate, formatNumber } = useI18n();
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [categoryQuery, setCategoryQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Compute exact book counts per category key from the catalog
  const categoriesWithCounts = useMemo<CategoryWithCount[]>(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      const key = getCategoryKey(book);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return categories.map((cat) => ({
      ...cat,
      count: counts.get(cat.key) ?? 0
    }));
  }, [books, categories]);

  // Top categories ordered by book count descending, then localized label
  const topCategories = useMemo<CategoryWithCount[]>(() => {
    return [...categoriesWithCounts]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, lang))
      .slice(0, quickPathwaysLimit);
  }, [categoriesWithCounts, lang, quickPathwaysLimit]);

  const activeCategoryObj = useMemo<CategoryWithCount | null>(() => {
    if (activeCategory === ALL_CATEGORIES_KEY) return null;
    return (
      categoriesWithCounts.find((cat) => cat.key === activeCategory) ?? {
        key: activeCategory,
        label: activeCategory,
        count: 0
      }
    );
  }, [activeCategory, categoriesWithCounts]);

  const isActiveInTop = useMemo<boolean>(() => {
    if (!activeCategoryObj) return false;
    return topCategories.some((cat) => cat.key === activeCategoryObj.key);
  }, [activeCategoryObj, topCategories]);

  // Filtered categories inside the searchable "All Categories" directory
  const filteredCategories = useMemo<CategoryWithCount[]>(() => {
    const sorted = [...categoriesWithCounts].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label, lang)
    );
    const normQuery = normalizeSearchText(categoryQuery.trim(), lang);
    if (!normQuery) return sorted;
    return sorted.filter((cat) =>
      normalizeSearchText(`${cat.label} ${cat.key}`, lang).includes(normQuery)
    );
  }, [categoriesWithCounts, categoryQuery, lang]);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 15);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setPickerOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickerOpen]);

  return (
    <section
      aria-label={t('categoryChipsAria')}
      data-testid="category-pathways"
      className="mb-6 space-y-2.5"
    >
      {/* Quick Pathways Bar */}
      <div id="categoryChips" className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* "All References" Button */}
        <button
          type="button"
          data-category={ALL_CATEGORIES_KEY}
          data-testid="category-chip-all"
          aria-pressed={activeCategory === ALL_CATEGORIES_KEY}
          onClick={() => onSelectCategory(ALL_CATEGORIES_KEY)}
          className={cn(
            'chip-item inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
            activeCategory === ALL_CATEGORIES_KEY
              ? 'active border-primary bg-primary text-primary-foreground shadow-2xs'
              : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary/70'
          )}
        >
          <span>{t('allReferences')}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.2 text-[11px] tabular-nums',
              activeCategory === ALL_CATEGORIES_KEY
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {formatNumber(books.length)}
          </span>
        </button>

        {/* Top High-Density Categories */}
        {topCategories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              data-category={cat.key}
              data-testid={`category-chip-${cat.key}`}
              aria-pressed={isActive}
              onClick={() => onSelectCategory(isActive ? ALL_CATEGORIES_KEY : cat.key)}
              className={cn(
                'chip-item inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring max-w-full',
                isActive
                  ? 'active border-primary bg-primary text-primary-foreground shadow-2xs'
                  : 'border-border bg-card text-foreground/90 hover:border-primary/50 hover:bg-secondary/70'
              )}
            >
              <span className="truncate max-w-[180px] sm:max-w-[220px]">{cat.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums shrink-0',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {formatNumber(cat.count)}
              </span>
            </button>
          );
        })}

        {/* If active category is outside top quick pathways, display it prominently */}
        {activeCategoryObj && !isActiveInTop && (
          <button
            type="button"
            data-category={activeCategoryObj.key}
            data-testid="category-chip-active-custom"
            aria-pressed={true}
            onClick={() => onSelectCategory(ALL_CATEGORIES_KEY)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-2xs cursor-pointer"
          >
            <Filter className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[190px]">{activeCategoryObj.label}</span>
            <span className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px] tabular-nums">
              {formatNumber(activeCategoryObj.count)}
            </span>
            <X className="size-3 shrink-0 opacity-85" aria-hidden="true" />
          </button>
        )}

        {/* Searchable "All Categories (114)" Directory Trigger */}
        {categoriesWithCounts.length > 0 && (
          <Button
            type="button"
            variant={pickerOpen ? 'secondary' : 'outline'}
            size="xs"
            data-testid="open-all-categories-btn"
            aria-expanded={pickerOpen}
            aria-controls="allCategoriesDirectoryPanel"
            onClick={() => setPickerOpen((prev) => !prev)}
            className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold border-primary/35 text-primary hover:text-primary"
          >
            <Compass className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {translate('جميع التصنيفات', 'All categories')} (
              {formatNumber(categoriesWithCounts.length)})
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 transition-transform',
                pickerOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </Button>
        )}
      </div>

      {/* Expandable Searchable Directory for All 114 Categories */}
      {pickerOpen && (
        <div
          id="allCategoriesDirectoryPanel"
          role="region"
          aria-label={translate('دليل جميع التصنيفات', 'All categories directory')}
          data-testid="all-categories-panel"
          className="rounded-xl border border-border bg-card p-4 shadow-md space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder={translate(
                  'ابحث في جميع المسارات المعرفية…',
                  'Search all knowledge paths…'
                )}
                aria-label={translate('البحث في التصنيفات', 'Search categories')}
                data-testid="category-search-input"
                className="h-9 w-full rounded-lg border border-input bg-background ps-8 pe-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
              {categoryQuery && (
                <button
                  type="button"
                  onClick={() => setCategoryQuery('')}
                  aria-label={t('clearSearchAria')}
                  className="absolute top-1/2 -translate-y-1/2 end-2 inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatNumber(filteredCategories.length)} /{' '}
                {formatNumber(categoriesWithCounts.length)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                data-testid="close-all-categories-btn"
                onClick={() => setPickerOpen(false)}
              >
                <X className="size-3.5" aria-hidden="true" />
                <span>{t('txtModalClose')}</span>
              </Button>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <p
              data-testid="category-search-empty"
              className="py-4 text-center text-xs text-muted-foreground"
            >
              {translate(
                'لا توجد تصنيفات مطابقة لبحثك.',
                'No categories match your search.'
              )}
            </p>
          ) : (
            <div
              data-testid="all-categories-list"
              className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-72 overflow-y-auto pe-1"
            >
              {filteredCategories.map((cat) => {
                const isSelected = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    data-testid={`directory-category-${cat.key}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      onSelectCategory(cat.key);
                      setPickerOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-start text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                      isSelected
                        ? 'border-primary bg-primary/12 text-primary font-semibold'
                        : 'border-border/60 bg-background/70 text-foreground hover:border-primary/40 hover:bg-secondary/60'
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {isSelected && (
                        <Check
                          className="size-3.5 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
                      {formatNumber(cat.count)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
