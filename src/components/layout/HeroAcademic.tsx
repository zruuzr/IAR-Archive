import { Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { ALL_CATEGORIES_KEY } from '@/lib/catalog-query';
import type { CategoryOption } from '@/types/book';

export interface HeroAcademicProps {
  booksCount: number;
  categoriesCount: number;
  visitsCount: number | null;
  loaded: boolean;
  query?: string;
  category?: string;
  categories?: readonly CategoryOption[];
  onQueryChange?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onOpenSpotlight?: () => void;
  onSelectKeyword?: (keyword: string) => void;
}

interface QuickPill {
  readonly ar: string;
  readonly en: string;
}

const MANAGEMENT_QUICK_PILLS: readonly QuickPill[] = [
  { ar: 'إدارة الأعمال', en: 'Business Admin' },
  { ar: 'القيادة والتنظيم', en: 'Leadership & Org' },
  { ar: 'التحليل المالي والمحاسبة', en: 'Financial Analysis' },
  { ar: 'بيتر دروكر والإدارة', en: 'Peter Drucker' },
  { ar: 'مناهج البحث العلمي', en: 'Research Methods' },
  { ar: 'التسويق الاستراتيجي', en: 'Strategic Marketing' }
] as const;

/**
 * Sovereign Hero & Central Search Section (Concept 1: البوابة السيادية الوطنية).
 * Houses the prominent royal green gradient backdrop, large white search box with integrated
 * category dropdown and "بحث رسمي" action, quick access pills, and exact test IDs.
 */
export function HeroAcademic({
  booksCount,
  categoriesCount,
  visitsCount: _visitsCount,
  loaded,
  query = '',
  category = ALL_CATEGORIES_KEY,
  categories = [],
  onQueryChange,
  onCategoryChange,
  onOpenSpotlight,
  onSelectKeyword
}: HeroAcademicProps) {
  const { lang, t, translate } = useI18n();
  const [localInput, setLocalInput] = useState<string>(query);

  const inputValue = localInput.trim() === query ? localInput : query;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onQueryChange) {
      onQueryChange(inputValue);
    }
    const container = document.getElementById('mainLibraryContent');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePillClick = (pill: string) => {
    setLocalInput(pill);
    if (onQueryChange) {
      onQueryChange(pill);
    }
    if (onSelectKeyword) {
      onSelectKeyword(pill);
    }
  };

  return (
    <section
      aria-labelledby="txtAboutTitle"
      data-testid="hero-academic"
      className="relative overflow-hidden bg-gradient-to-b from-regal-900 via-regal-900 to-regal-950 text-white pb-8 pt-5 px-4 sm:px-6 border-b border-regal-800"
    >
      {/* Hidden/Preserved A11y & Test Elements */}
      <div className="sr-only">
        <span id="txtKicker" data-testid="hero-kicker">
          {t('txtKicker')}
        </span>
        <h1 id="txtAboutTitle" data-testid="hero-title">
          {t('txtAboutTitle')}
        </h1>
        <p id="txtAboutDesc" data-testid="hero-description">
          {t('txtAboutDesc')}
        </p>
        <span data-testid="stat-total-books">{loaded ? String(booksCount) : '—'}</span>
        <span data-testid="stat-total-categories">
          {loaded ? String(categoriesCount) : '—'}
        </span>
        <span data-testid="stat-archive-year">2026</span>
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Sovereign Central Search Box */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white rounded-2xl p-2 doc-shadow flex flex-col md:flex-row items-stretch md:items-center gap-2 border border-gold-500/40 transition-all shadow-xl"
        >
          {/* Text Input */}
          <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 w-full border-b md:border-b-0 md:border-l md:dark:border-l-0 rtl:md:border-l-0 rtl:md:border-r border-slate-100 pb-2 md:pb-0">
            <Search className="size-5 text-regal-800 shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => {
                const val = e.target.value;
                setLocalInput(val);
                if (onQueryChange) onQueryChange(val);
              }}
              placeholder={translate(
                'ابحث بالعنوان، المؤلف (مثلاً: دروكر، كارنيجي)، الحقل الإداري، أو الفكرة...',
                'Search by title, author (e.g. Drucker, Carnegie), field, or concept...'
              )}
              aria-label={t('searchLabel')}
              className="w-full text-slate-900 placeholder-slate-400 focus:outline-none text-xs sm:text-sm font-medium py-2 bg-transparent"
            />
            {inputValue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setLocalInput('');
                  if (onQueryChange) onQueryChange('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label={t('clearSearchAria')}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown + Search Button */}
          <div className="flex items-center gap-2 w-full md:w-auto px-1 sm:px-2">
            {categories.length > 0 && onCategoryChange && (
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                aria-label={translate('تصنيف البحث', 'Search Category')}
                className="flex-1 md:flex-initial bg-slate-100 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none cursor-pointer max-w-full md:max-w-[170px] truncate"
              >
                <option value={ALL_CATEGORIES_KEY}>
                  {translate('جميع التصنيفات', 'All Categories')}
                </option>
                {categories.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              className="bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-regal-950 px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs transition shadow-md whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>{translate('بحث إداري', 'Search Archive')}</span>
            </button>
          </div>
        </form>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
          <span className="text-gold-400 font-bold flex items-center gap-1">
            <Sparkles className="size-3 text-gold-400" />
            {translate('وصول سريع:', 'Quick Access:')}
          </span>
          {MANAGEMENT_QUICK_PILLS.map((pill) => (
            <button
              key={pill.ar}
              type="button"
              onClick={() => handlePillClick(pill.ar)}
              className="bg-regal-800/80 hover:bg-regal-700 text-regal-100 px-3 py-1 rounded-lg border border-regal-700 text-[11px] font-medium transition cursor-pointer"
            >
              {lang === 'ar' ? pill.ar : pill.en}
            </button>
          ))}

          {/* Spotlight Trigger */}
          {onOpenSpotlight && (
            <button
              type="button"
              onClick={onOpenSpotlight}
              data-testid="hero-spotlight-trigger"
              className="ms-auto hidden md:inline-flex items-center gap-1.5 text-regal-300 hover:text-gold-400 text-[11px] font-mono cursor-pointer"
            >
              <span>{t('spotlightSearch')}</span>
              <kbd className="rounded border border-regal-700 bg-regal-950 px-1 py-0.5 text-[9px] text-gold-400">
                ⌘K
              </kbd>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
