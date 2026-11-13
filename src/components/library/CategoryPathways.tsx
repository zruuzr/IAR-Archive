import { Check, ChevronDown, Compass, Filter, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HERITAGE_CLOTHS,
  HeritageSectionHead,
  PathwayGrid,
  type HeritagePathway
} from '@/components/heritage';
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
 * Knowledge Pathways built with PathwayGrid and HeritageSectionHead.
 * Features:
 * 1. Heritage octagram count badges and star-tessellated gateway cards.
 * 2. "All references" chip + active category indicator.
 * 3. Searchable full directory of all categories with live counts.
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

  const pathwayItems: readonly HeritagePathway[] = useMemo(() => {
    return topCategories.map((cat, idx) => ({
      key: cat.key,
      label: cat.label,
      count: cat.count,
      color: HERITAGE_CLOTHS[idx % HERITAGE_CLOTHS.length]
    }));
  }, [topCategories]);

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
      id="paths"
      aria-label={t('categoryChipsAria')}
      data-testid="category-pathways"
      className="mb-10 space-y-4"
    >
      <HeritageSectionHead
        eyebrow={translate('مسارات معرفية', 'Knowledge Pathways')}
        title={translate(
          'بوابات إلى المعرفة الإدارية',
          'Gateways to Administrative Knowledge'
        )}
        subtitle={translate(
          'تُصنَّف المراجع في مسارات رئيسية، ولكل مسار تصنيفاته الدقيقة. اختر بوابتك وابدأ.',
          'References are curated into key pathways, each with refined specializations. Choose your gateway to explore.'
        )}
      />

      {/* Heritage Gateway Cards Grid */}
      <PathwayGrid
        items={pathwayItems}
        activeKey={activeCategory}
        onSelect={(key) => {
          onSelectCategory(key === activeCategory ? ALL_CATEGORIES_KEY : key);
        }}
        formatCount={(count) => (typeof count === 'number' ? formatNumber(count) : count)}
      />

      {/* Auxiliary bar: All references, custom active category chip, and Full Directory button */}
      <div
        id="categoryChips"
        className="flex flex-wrap items-center justify-center gap-2 pt-2"
      >
        {/* "All References" Button */}
        <button
          type="button"
          data-category={ALL_CATEGORIES_KEY}
          data-testid="category-chip-all"
          aria-pressed={activeCategory === ALL_CATEGORIES_KEY}
          onClick={() => onSelectCategory(ALL_CATEGORIES_KEY)}
          className={cn('hx-chip', activeCategory === ALL_CATEGORIES_KEY && 'is-on')}
        >
          <span>{t('allReferences')}</span>
          <span className="ms-1.5 font-mono text-[11px] font-semibold opacity-85">
            {formatNumber(books.length)}
          </span>
        </button>

        {/* If active category is outside top quick pathways, display it prominently */}
        {activeCategoryObj && !isActiveInTop && (
          <button
            type="button"
            data-category={activeCategoryObj.key}
            data-testid="category-chip-active-custom"
            aria-pressed={true}
            onClick={() => onSelectCategory(ALL_CATEGORIES_KEY)}
            className="hx-chip is-on"
          >
            <Filter className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[190px]">{activeCategoryObj.label}</span>
            <span className="ms-1 font-mono text-[11px] font-semibold">
              {formatNumber(activeCategoryObj.count)}
            </span>
            <X className="size-3 shrink-0 ms-1 opacity-85" aria-hidden="true" />
          </button>
        )}

        {/* Searchable "All Categories (114)" Directory Trigger */}
        {categoriesWithCounts.length > 0 && (
          <button
            type="button"
            data-testid="open-all-categories-btn"
            aria-expanded={pickerOpen}
            aria-controls="allCategoriesDirectoryPanel"
            onClick={() => setPickerOpen((prev) => !prev)}
            className={cn('hx-chip gap-1.5', pickerOpen && 'is-on')}
          >
            <Compass
              className={cn(
                'size-3.5 shrink-0',
                pickerOpen
                  ? 'text-current'
                  : 'text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]'
              )}
              aria-hidden="true"
            />
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
          </button>
        )}
      </div>

      {/* Expandable Searchable Directory for All Categories */}
      {pickerOpen && (
        <div
          id="allCategoriesDirectoryPanel"
          role="region"
          aria-label={translate('دليل جميع التصنيفات', 'All categories directory')}
          data-testid="all-categories-panel"
          className="hx-panel p-4 sm:p-5 space-y-3.5 hx-fade"
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-3.5 text-[var(--hx-muted)]"
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
                className="h-9.5 w-full rounded-[10px] border border-[var(--hx-line)] bg-[var(--hx-surface-2)] ps-8 pe-8 text-xs sm:text-sm text-[var(--hx-ink)] placeholder:text-[var(--hx-muted)] outline-none focus:outline-none focus-visible:outline-none focus:border-[var(--hx-gold)] focus:ring-2 focus:ring-[var(--hx-gold-soft)] [&::-webkit-search-cancel-button]:hidden"
              />
              {categoryQuery && (
                <button
                  type="button"
                  onClick={() => setCategoryQuery('')}
                  aria-label={t('clearSearchAria')}
                  className="absolute top-1/2 -translate-y-1/2 end-2 inline-flex size-5 items-center justify-center rounded-md text-[var(--hx-muted)] hover:text-[var(--hx-ink)] cursor-pointer"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--hx-muted)] tabular-nums">
                {formatNumber(filteredCategories.length)} /{' '}
                {formatNumber(categoriesWithCounts.length)}
              </span>
              <button
                type="button"
                data-testid="close-all-categories-btn"
                onClick={() => setPickerOpen(false)}
                className="hx-btn hx-btn-line !min-h-8 !px-3 !py-1 !text-xs"
              >
                <X className="size-3.5" aria-hidden="true" />
                <span>{t('txtModalClose')}</span>
              </button>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <p
              data-testid="category-search-empty"
              className="py-5 text-center text-xs text-[var(--hx-muted)]"
            >
              {translate(
                'لا توجد تصنيفات مطابقة لبحثك.',
                'No categories match your search.'
              )}
            </p>
          ) : (
            <div
              data-testid="all-categories-list"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-h-72 overflow-y-auto pe-1"
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
                      'flex items-center justify-between gap-2 rounded-[10px] border px-3 py-2 text-start text-xs transition-all cursor-pointer',
                      isSelected
                        ? 'border-transparent bg-[var(--hx-chip-on-bg)] text-[var(--hx-chip-on-ink)] font-semibold shadow-2xs'
                        : 'border-[var(--hx-line)] bg-[var(--hx-surface-2)]/65 text-[var(--hx-ink)] hover:border-[var(--hx-gold)] hover:bg-[var(--hx-surface-2)]'
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {isSelected && (
                        <Check
                          className="size-3.5 shrink-0 text-[var(--hx-gold-bright)] dark:text-current"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{cat.label}</span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-mono tabular-nums shrink-0',
                        isSelected
                          ? 'bg-white/15 dark:bg-black/15 text-current'
                          : 'bg-[var(--hx-surface)] border border-[var(--hx-line)] text-[var(--hx-muted)]'
                      )}
                    >
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
