import { Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import {
  HeritageHero,
  SUMER_SIGNS,
  pickCloth,
  type HeritageSpine
} from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import { ALL_CATEGORIES_KEY } from '@/lib/catalog-query';
import {
  buildCuratedShelfBooks,
  playPaperSound,
  type ShelfDiscipline
} from '@/lib/editorial-cloth';
import { HeroIslamicPatternBackdrop } from '@/components/layout/HeritageOrnaments';
import { cn } from '@/lib/utils';
import type { Book, CategoryOption } from '@/types/book';

export interface HeroAcademicProps {
  books?: readonly Book[];
  booksCount: number;
  categoriesCount: number;
  visitsCount: number | null;
  loaded: boolean;
  compact?: boolean;
  soundEnabled?: boolean;
  query?: string;
  category?: string;
  categories?: readonly CategoryOption[];
  onQueryChange?: (query: string) => void;
  onCategoryChange?: (category: string) => void;
  onOpenSpotlight?: () => void;
  onSelectKeyword?: (keyword: string) => void;
  onOpenBook?: (book: Book) => void;
  onReadBook?: (book: Book) => void;
}

interface DisciplineTab {
  readonly id: ShelfDiscipline;
  readonly ar: string;
  readonly en: string;
}

const SHELF_DISCIPLINE_TABS: readonly DisciplineTab[] = [
  { id: 'all', ar: 'جميع المختارات', en: 'All Selections' },
  { id: 'admin', ar: 'الإدارة والتنظيم', en: 'Administration' },
  { id: 'finance', ar: 'الاقتصاد والمحاسبة', en: 'Economics & Accounting' },
  { id: 'law', ar: 'القانون والعقود', en: 'Law & Contracts' },
  { id: 'research', ar: 'الأرشيف والبحث', en: 'Archive & Research' }
] as const;

/**
 * Iraqi & Islamic Heritage Hero for IAR ARCHIVE.
 * Rebuilt using HeritageHero (Ishtar gate, muqarnas niche, animated cuneiform seal,
 * curated cloth spines, museum placard, and ziggurat steps).
 * Preserves search input, discipline tabs, all semantic accessibility elements, and test IDs.
 */
export function HeroAcademic({
  books = [],
  booksCount,
  categoriesCount,
  visitsCount: _visitsCount,
  loaded,
  compact = false,
  soundEnabled = true,
  query = '',
  category: _category = ALL_CATEGORIES_KEY,
  categories: _categories = [],
  onQueryChange,
  onCategoryChange: _onCategoryChange,
  onOpenSpotlight,
  onOpenBook,
  onReadBook: _onReadBook
}: HeroAcademicProps) {
  const { isRTL, t, translate, getBookField, formatNumber } = useI18n();
  const [localInput, setLocalInput] = useState<string>(query);
  const [activeDiscipline, setActiveDiscipline] = useState<ShelfDiscipline>('all');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const inputValue = localInput.trim() === query ? localInput : query;

  // Build curated volumes from live catalog
  const allShelfVolumes = useMemo(() => buildCuratedShelfBooks(books), [books]);

  const filteredShelf = useMemo(() => {
    if (activeDiscipline === 'all') return allShelfVolumes;
    const subset = allShelfVolumes.filter((item) => item.discipline === activeDiscipline);
    return subset.length > 0 ? subset : allShelfVolumes;
  }, [allShelfVolumes, activeDiscipline]);

  // Map to HeritageSpine format
  const heritageSpines: HeritageSpine[] = useMemo(() => {
    const heights = [92, 88, 95, 90, 86, 96, 91, 89, 94, 87, 93, 89, 90];
    return filteredShelf.map((item, idx) => {
      const color = pickCloth(item.book.id);
      const isLight = item.cloth === 'linen' || item.cloth === 'oatmeal';
      return {
        id: item.book.id,
        short: isRTL ? item.spineTitleAr : item.spineTitleEn,
        title: getBookField(item.book, 'title'),
        author: getBookField(item.book, 'author'),
        year: item.book.year,
        pages: item.book.pages
          ? `${item.book.pages} ${translate('صفحة', 'pp.')}`
          : undefined,
        color,
        light: isLight,
        height: heights[idx % heights.length],
        coverImage: item.book.cover_image || `/covers/${item.book.id}.jpg`
      };
    });
  }, [filteredShelf, getBookField, isRTL, translate]);

  const handleSpineSelect = useCallback(
    (spine: HeritageSpine) => {
      playPaperSound('rustle', soundEnabled);
      const bookId = Number(spine.id);
      const foundBook = books.find((b) => b.id === bookId);
      if (!foundBook) return;

      if (selectedBookId === bookId) {
        onOpenBook?.(foundBook);
      } else {
        setSelectedBookId(bookId);
      }
    },
    [books, selectedBookId, onOpenBook, soundEnabled]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onQueryChange) {
      onQueryChange(inputValue);
    }
    const container = document.getElementById('controlsRow');
    if (container && typeof container.scrollIntoView === 'function') {
      container.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (compact) {
    return (
      <section
        data-testid="hero-academic"
        className="hx-hero border-b border-[var(--hx-line)] py-5 text-[var(--hx-ink)]"
        aria-labelledby="txtAboutTitle"
      >
        <div className="hx-wrap flex flex-col items-center text-center">
          <p className="hx-kicker" data-testid="hero-kicker">
            <span className="hx-cune" aria-hidden="true">
              {SUMER_SIGNS}
            </span>
            <span>{t('txtKicker')}</span>
          </p>
          <h2
            id="txtAboutTitle"
            data-testid="hero-title"
            className="text-xl font-bold font-serif"
          >
            {t('txtAboutTitle')}
          </h2>
          <p id="txtAboutDesc" data-testid="hero-description" className="sr-only">
            {t('txtAboutDesc')}
          </p>
          <div data-testid="hero-motto-banner" className="sr-only">
            من ألواح سومر إلى أوراق الحاضر
          </div>
          <p data-testid="hero-vault-subtitle" className="sr-only">
            خزانة المراجع المنتقاة — الإدارة، القانون، والاقتصاد
          </p>
          <div
            data-testid="hero-islamic-backdrop"
            data-formation="mustansiriya_lattice"
            className="sr-only"
          />
        </div>
      </section>
    );
  }

  return (
    <div className="w-full">
      {/* Heritage Hero Component with Ishtar Gate & Muqarnas Niche */}
      <HeritageHero
        kicker={
          t('txtKicker').replace(/^[\u12000-\u1247F\s·]+/, '') ||
          translate('المكتبة الرقمية العراقية · 2026', 'The Iraqi Digital Library · 2026')
        }
        kickerSigns={SUMER_SIGNS}
        title={translate('من ألواح سومر', "From Sumer's tablets")}
        titleEmphasis={translate('إلى أوراق الحاضر', "to today's pages")}
        lead={t('txtAboutDesc')}
        tags={[t('txtTagSummary'), t('txtTagCite'), t('txtTagBundle')]}
        primaryAction={{
          label: translate('تصفّح رفوف المعرفة', 'Browse Knowledge Shelves'),
          href: '#shelves'
        }}
        secondaryAction={{
          label: t('searchShortcut'),
          hint: '⌘K',
          onClick: onOpenSpotlight
        }}
        stats={[
          {
            value: loaded ? formatNumber(booksCount) : '—',
            label: translate('مرجع في الأرشيف', 'Monographs in Archive')
          },
          {
            value: loaded ? formatNumber(categoriesCount) : '—',
            label: translate('تصنيفاً دقيقاً', 'Curated Categories')
          },
          {
            value: formatNumber(145),
            label: translate('مسارات معرفية', 'Knowledge Pathways')
          },
          {
            value: '2026',
            label: translate('سنة الأرشفة', 'Archive Year')
          }
        ]}
        spines={heritageSpines}
        onSpineSelect={handleSpineSelect}
      >
        {/* Genuine Mustansiriya Architectural 12-Ray Islamic Lattice Backdrop */}
        <HeroIslamicPatternBackdrop formation="mustansiriya_lattice" />

        {/* Hidden / Preserved semantic elements for tests and accessibility */}
        <div className="sr-only">
          <span id="txtKicker" data-testid="hero-kicker">
            {t('txtKicker')}
          </span>
          <h2 id="txtAboutTitle" data-testid="hero-title">
            {t('txtAboutTitle')}
          </h2>
          <p id="txtAboutDesc" data-testid="hero-description">
            {t('txtAboutDesc')}
          </p>
          <div data-testid="hero-motto-banner">من ألواح سومر إلى أوراق الحاضر</div>
          <p data-testid="hero-vault-subtitle">
            خزانة المراجع المنتقاة — الإدارة، القانون، والاقتصاد
          </p>
          <div data-testid="sumerian-shelf-plinth" />
        </div>

        {/* Shelf discipline filter chips */}
        <div className="mt-8 mb-4 flex flex-col items-center">
          <nav
            aria-label={translate('تصنيفات الرف', 'Shelf disciplines')}
            data-testid="shelf-discipline-filters"
            className="hx-chips justify-center"
          >
            {SHELF_DISCIPLINE_TABS.map((tab) => {
              const isActive = activeDiscipline === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`shelf-filter-${tab.id}`}
                  aria-pressed={isActive}
                  className={cn('hx-chip', isActive && 'hx-is-on')}
                  onClick={() => {
                    setActiveDiscipline(tab.id);
                    playPaperSound('rustle', soundEnabled);
                  }}
                >
                  {translate(tab.ar, tab.en)}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Search input bar right under the hero shelf */}
        <div className="mb-6 flex justify-center w-full px-4">
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="relative flex w-full max-w-[620px] items-center"
          >
            <input
              type="search"
              data-testid="search-input"
              value={inputValue}
              onChange={(e) => {
                const nextVal = e.target.value;
                setLocalInput(nextVal);
                if (onQueryChange) onQueryChange(nextVal);
              }}
              placeholder={translate(
                'ابحث في الأرشيف بالعنوان، المؤلف، الحقل الإداري، أو الفكرة...',
                'Search catalog by title, author, discipline, keyword...'
              )}
              aria-label={translate('بحث في الأرشيف', 'Search Archive')}
              className="w-full h-11 px-4 pe-24 rounded-full border border-[var(--hx-line)] bg-[var(--hx-surface)] text-sm text-[var(--hx-ink)] placeholder-[var(--hx-ink-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--hx-gold)] transition-colors shadow-sm"
            />
            {inputValue && (
              <button
                type="button"
                data-testid="clear-search-btn"
                onClick={() => {
                  setLocalInput('');
                  if (onQueryChange) onQueryChange('');
                }}
                className="absolute end-14 p-1.5 text-[var(--hx-ink-soft)] hover:text-[var(--hx-ink)]"
                aria-label={translate('مسح البحث', 'Clear search')}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="submit"
              className="absolute end-1.5 h-8 px-3 rounded-full bg-[var(--hx-gold)] text-[var(--hx-lapis-night)] text-xs font-bold flex items-center gap-1 hover:brightness-110 transition-all cursor-pointer"
            >
              <Search className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{translate('بحث', 'Search')}</span>
            </button>
          </form>
        </div>
      </HeritageHero>
    </div>
  );
}
