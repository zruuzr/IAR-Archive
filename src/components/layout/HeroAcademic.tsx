import { ArrowLeft, ArrowRight, BookOpen, Search, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties
} from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { ALL_CATEGORIES_KEY } from '@/lib/catalog-query';
import {
  buildCuratedShelfBooks,
  DisciplineOrnament,
  playPaperSound,
  type ShelfDiscipline
} from '@/lib/editorial-cloth';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
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
  { id: 'finance', ar: 'المحاسبة والمالية', en: 'Accounting & Finance' },
  { id: 'law', ar: 'القانون والعقود', en: 'Law & Contracts' },
  { id: 'research', ar: 'الأرشيف والبحث', en: 'Archive & Research' }
] as const;

/**
 * Editorial Cloth & Linen Bookshelf Hero ("Mesopotamian Editorial Monograph").
 * Displays 13 curated cloth-bound volumes with on-shelf face-out accordion unfolding,
 * live museum placard, subtle paper acoustics, magnetic preview cursor, and architectural search bar.
 */
export function HeroAcademic({
  books = [],
  booksCount,
  categoriesCount,
  visitsCount,
  loaded,
  compact = false,
  soundEnabled = true,
  query = '',
  category = ALL_CATEGORIES_KEY,
  categories = [],
  onQueryChange,
  onCategoryChange,
  onOpenSpotlight,
  onOpenBook,
  onReadBook
}: HeroAcademicProps) {
  const { lang, isRTL, t, translate, getBookField, formatNumber } = useI18n();
  const [localInput, setLocalInput] = useState<string>(query);
  const [activeDiscipline, setActiveDiscipline] = useState<ShelfDiscipline>('all');
  const [activeShelfIdx, setActiveShelfIdx] = useState<number>(-1);
  const [cursorVisible, setCursorVisible] = useState<boolean>(false);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const cursorTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cursorCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const inputValue = localInput.trim() === query ? localInput : query;

  // Build curated 13-volume shelf from live catalog
  const allShelfVolumes = useMemo(() => buildCuratedShelfBooks(books), [books]);

  const filteredShelf = useMemo(() => {
    if (activeDiscipline === 'all') return allShelfVolumes;
    const subset = allShelfVolumes.filter((item) => item.discipline === activeDiscipline);
    return subset.length > 0 ? subset : allShelfVolumes;
  }, [allShelfVolumes, activeDiscipline]);

  const defaultCenterIndex = useMemo(
    () => (filteredShelf.length > 0 ? Math.floor(filteredShelf.length / 2) : 0),
    [filteredShelf.length]
  );

  const resolvedIndex =
    activeShelfIdx >= 0 && activeShelfIdx < filteredShelf.length
      ? activeShelfIdx
      : defaultCenterIndex;

  const activeVolume = filteredShelf[resolvedIndex] ?? null;

  const selectShelfIndex = useCallback(
    (nextIdx: number, withSound = true) => {
      if (filteredShelf.length === 0) return;
      const wrapped =
        ((nextIdx % filteredShelf.length) + filteredShelf.length) % filteredShelf.length;
      setActiveShelfIdx(wrapped);
      if (withSound) {
        playPaperSound('rustle', soundEnabled);
      }
    },
    [filteredShelf.length, soundEnabled]
  );

  // Smooth Lerp magnetic cursor animation on desktop
  useEffect(() => {
    if (compact || typeof window === 'undefined') return undefined;

    const handleMouseMove = (e: MouseEvent) => {
      cursorTargetRef.current.x = e.clientX;
      cursorTargetRef.current.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let rafId = 0;
    const tick = () => {
      cursorCurrentRef.current.x +=
        (cursorTargetRef.current.x - cursorCurrentRef.current.x) * 0.22;
      cursorCurrentRef.current.y +=
        (cursorTargetRef.current.y - cursorCurrentRef.current.y) * 0.22;

      if (cursorElRef.current) {
        cursorElRef.current.style.left = `${cursorCurrentRef.current.x.toFixed(1)}px`;
        cursorElRef.current.style.top = `${cursorCurrentRef.current.y.toFixed(1)}px`;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.cancelAnimationFrame(rafId);
    };
  }, [compact]);

  // Keyboard ArrowLeft / ArrowRight navigation along the shelf
  useEffect(() => {
    if (compact || filteredShelf.length <= 1 || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        selectShelfIndex(resolvedIndex + (isRTL ? 1 : -1));
      } else if (e.key === 'ArrowRight') {
        selectShelfIndex(resolvedIndex + (isRTL ? -1 : 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [compact, filteredShelf.length, isRTL, resolvedIndex, selectShelfIndex]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

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

  const PrevArrowIcon = isRTL ? ArrowRight : ArrowLeft;
  const NextArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section
      aria-labelledby="txtAboutTitle"
      data-testid="hero-academic"
      className={cn(
        'relative border-b hairline-border-strong bg-background text-foreground transition-colors',
        compact ? 'py-4 px-4 sm:px-6' : 'pt-7 pb-8 px-4 sm:px-6 lg:px-8'
      )}
    >
      {/* Preserved Semantic A11y Metadata */}
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
      </div>

      {/* Magnetic Preview Cursor Badge (Desktop Fine Pointer Only) */}
      {!compact && (
        <div
          ref={cursorElRef}
          aria-hidden="true"
          className={cn('magnetic-cursor hidden lg:flex', cursorVisible && 'is-visible')}
        >
          <span>{translate('معاينة', 'Inspect')}</span>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1360px] flex-col items-center">
        {/* Interactive Cloth Bookshelf Stage (Shown on Main Catalog View) */}
        {!compact && (
          <div className="flex w-full flex-col items-center">
            {/* Architectural Rubric & Segmented Discipline Filter Bar */}
            <div className="mb-6 text-center">
              <p className="mb-2.5 text-xs tracking-wide text-muted-foreground">
                {translate(
                  'خزانة المراجع المنتقاة — الإدارة، القانون، والمالية العامة',
                  'Curated Reference Vault — Administration, Law & Public Finance'
                )}
              </p>

              <nav
                aria-label={translate('تصنيفات الرف', 'Shelf disciplines')}
                data-testid="shelf-discipline-filters"
                className="inline-flex flex-wrap justify-center overflow-hidden rounded-[4px] border hairline-border-strong bg-card"
              >
                {SHELF_DISCIPLINE_TABS.map((tab, idx) => {
                  const isActive = activeDiscipline === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`shelf-filter-${tab.id}`}
                      aria-pressed={isActive}
                      onClick={() => {
                        setActiveDiscipline(tab.id);
                        setActiveShelfIdx(-1);
                        playPaperSound('rustle', soundEnabled);
                      }}
                      className={cn(
                        'px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        idx > 0 && 'border-s hairline-border',
                        isActive
                          ? 'bg-foreground text-background'
                          : 'bg-transparent text-secondary-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {lang === 'ar' ? tab.ar : tab.en}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Cloth & Linen Volumes Row */}
            {filteredShelf.length > 0 ? (
              <div className="flex w-full flex-col items-center">
                <div
                  role="listbox"
                  aria-label={translate(
                    'رف المجلدات الإدارية المنتقاة',
                    'Curated administrative volumes shelf'
                  )}
                  data-testid="editorial-cloth-shelf"
                  className="books-row"
                >
                  {filteredShelf.map((item, idx) => {
                    const isOpen = idx === resolvedIndex;
                    const spineTitle =
                      lang === 'en' ? item.spineTitleEn : item.spineTitleAr;
                    const fullTitle = getBookField(item.book, 'title');
                    const author =
                      getBookField(item.book, 'author') ||
                      getBookField(item.book, 'publisher') ||
                      'IAR ARCHIVE';
                    const catLabel = getCategoryLabel(item.book, lang);
                    const yearStr =
                      item.book.year && item.book.year !== '0' ? item.book.year : '2025';

                    const volumeStyle = {
                      '--spine-w': `${item.width}px`,
                      '--book-h': `${item.height}px`
                    } as CSSProperties;

                    return (
                      <article
                        key={item.book.id}
                        role="option"
                        aria-selected={isOpen}
                        aria-label={fullTitle}
                        tabIndex={0}
                        data-cloth={item.cloth}
                        data-testid={`shelf-book-${item.book.id}`}
                        style={volumeStyle}
                        onMouseEnter={() => {
                          if (hoverTimerRef.current) {
                            clearTimeout(hoverTimerRef.current);
                          }
                          if (!isOpen) {
                            hoverTimerRef.current = setTimeout(() => {
                              selectShelfIndex(idx, true);
                            }, 65);
                          } else {
                            setCursorVisible(true);
                          }
                        }}
                        onMouseMove={() => {
                          if (isOpen) setCursorVisible(true);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimerRef.current) {
                            clearTimeout(hoverTimerRef.current);
                          }
                          setCursorVisible(false);
                        }}
                        onClick={() => {
                          if (!isOpen) {
                            selectShelfIndex(idx, true);
                          } else if (onOpenBook) {
                            setCursorVisible(false);
                            playPaperSound('open', soundEnabled);
                            onOpenBook(item.book);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!isOpen) {
                              selectShelfIndex(idx, true);
                            } else if (onOpenBook) {
                              playPaperSound('open', soundEnabled);
                              onOpenBook(item.book);
                            }
                          }
                        }}
                        className={cn('shelf-book', isOpen && 'is-open')}
                      >
                        {/* 1) Vertical Cloth Spine View */}
                        <div className="book-spine-view">
                          <span
                            className="w-3/4 border-b pb-2 text-center font-mono text-[10px] tracking-wider"
                            style={{
                              color: 'var(--cloth-muted)',
                              borderColor: 'var(--cloth-rule)'
                            }}
                          >
                            {item.shelfNo}
                          </span>

                          <span className="spine-title-vertical">{spineTitle}</span>

                          <div
                            className="flex w-3/4 flex-col items-center gap-1.5 border-t pt-2"
                            style={{ borderColor: 'var(--cloth-rule)' }}
                          >
                            <span
                              className="size-1 rounded-full"
                              style={{ backgroundColor: 'var(--cloth-accent)' }}
                            />
                            <span
                              className="font-mono text-[9.5px]"
                              style={{ color: 'var(--cloth-muted)' }}
                            >
                              {yearStr}
                            </span>
                          </div>
                        </div>

                        {/* 2) Face-Out Unfolded Monograph Cover View */}
                        <div className="book-cover-view">
                          <div
                            className="flex items-center justify-between border-b pb-2 font-mono text-[9.5px] tracking-[0.12em]"
                            style={{
                              color: 'var(--cloth-muted)',
                              borderColor: 'var(--cloth-rule)'
                            }}
                          >
                            <span>IAR ARCHIVE</span>
                            <span>NO. {item.shelfNo}</span>
                          </div>

                          <div
                            className="my-2.5 flex flex-1 items-center justify-center border bg-black/[0.06]"
                            style={{
                              borderColor: 'var(--cloth-rule)',
                              color: 'var(--cloth-accent)'
                            }}
                          >
                            <DisciplineOrnament
                              discipline={item.discipline}
                              className="size-20 opacity-90"
                            />
                          </div>

                          <div className="text-start">
                            <span
                              className="mb-1 block truncate text-[10.5px] font-semibold"
                              style={{ color: 'var(--cloth-accent)' }}
                            >
                              {catLabel}
                            </span>
                            <h3 className="mb-2 line-clamp-2 font-serif text-[1.08rem] font-bold leading-snug">
                              {spineTitle}
                            </h3>
                          </div>

                          <div
                            className="flex items-center justify-between gap-2 border-t pt-1.5 text-[10px]"
                            style={{
                              color: 'var(--cloth-muted)',
                              borderColor: 'var(--cloth-rule)'
                            }}
                          >
                            <span className="max-w-[145px] truncate">{author}</span>
                            <span className="font-mono">{yearStr}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Architectural Ledge & Realistic Contact Shadow */}
                <div className="shelf-architectural-ledge" aria-hidden="true">
                  <div className="shelf-contact-shadow" />
                  <div className="shelf-hairline" />
                </div>
              </div>
            ) : (
              /* Subtle Loading Placeholder Shelf */
              <div className="flex h-[340px] w-full max-w-3xl items-end justify-center gap-2 pb-4 opacity-50">
                {Array.from({ length: 11 }, (_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xs bg-secondary animate-pulse',
                      idx === 5 ? 'h-[330px] w-[210px]' : 'h-[315px] w-[52px]'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Live Museum Placard Beneath the Shelf */}
            {activeVolume ? (
              <div
                data-testid="shelf-placard"
                className="mt-4 flex max-w-2xl flex-col items-center text-center"
              >
                <div className="mb-1.5 inline-flex items-center gap-4">
                  <button
                    type="button"
                    data-testid="shelf-prev-btn"
                    onClick={() => selectShelfIndex(resolvedIndex - 1)}
                    aria-label={translate('المجلد السابق', 'Previous volume')}
                    className="inline-flex size-7 items-center justify-center rounded-full border hairline-border-strong bg-transparent text-secondary-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background cursor-pointer"
                  >
                    <PrevArrowIcon className="size-3.5" aria-hidden="true" />
                  </button>

                  <span className="font-mono text-xs font-semibold tracking-wide text-primary">
                    IAR·{activeVolume.shelfNo} —{' '}
                    <span className="font-sans">
                      {getCategoryLabel(activeVolume.book, lang)}
                    </span>
                    {activeVolume.book.year && activeVolume.book.year !== '0'
                      ? ` · ${activeVolume.book.year}`
                      : ''}
                  </span>

                  <button
                    type="button"
                    data-testid="shelf-next-btn"
                    onClick={() => selectShelfIndex(resolvedIndex + 1)}
                    aria-label={translate('المجلد التالي', 'Next volume')}
                    className="inline-flex size-7 items-center justify-center rounded-full border hairline-border-strong bg-transparent text-secondary-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background cursor-pointer"
                  >
                    <NextArrowIcon className="size-3.5" aria-hidden="true" />
                  </button>
                </div>

                <h1 className="hero-title mb-1 font-serif text-2xl sm:text-3xl font-bold leading-snug text-foreground">
                  {getBookField(activeVolume.book, 'title')}
                </h1>

                {getBookField(activeVolume.book, 'author') && (
                  <p className="mb-3 text-sm text-muted-foreground">
                    {getBookField(activeVolume.book, 'author')}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-5">
                  {onOpenBook && (
                    <button
                      type="button"
                      data-testid="shelf-open-monograph-btn"
                      onClick={() => {
                        playPaperSound('open', soundEnabled);
                        onOpenBook(activeVolume.book);
                      }}
                      className="group inline-flex items-center gap-2 border-b border-foreground pb-1 text-xs sm:text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary cursor-pointer"
                    >
                      <span>
                        {translate(
                          'استعراض البطاقة المرجعية',
                          'Inspect Reference Monograph'
                        )}
                      </span>
                      <NextArrowIcon
                        className="size-3.5 transition-transform group-hover:-translate-x-0.5 ltr:group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  )}

                  {onReadBook && activeVolume.book.file_path && (
                    <button
                      type="button"
                      data-testid="shelf-read-pdf-btn"
                      onClick={() => onReadBook(activeVolume.book)}
                      className="inline-flex items-center gap-1.5 border-b border-transparent pb-1 text-xs sm:text-sm font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <BookOpen className="size-3.5" aria-hidden="true" />
                      <span>{translate('مطالعة الوثيقة', 'Read Document')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center">
                <h1 className="hero-title font-serif text-2xl sm:text-3xl font-bold text-foreground">
                  {t('txtAboutTitle')}
                </h1>
              </div>
            )}
          </div>
        )}

        {/* Architectural Hairline Search & Archival Counters Dock */}
        <div
          className={cn(
            'w-full max-w-4xl',
            !compact && 'mt-7 border-t hairline-border pt-6'
          )}
        >
          <form
            onSubmit={handleSearchSubmit}
            className="flex flex-col md:flex-row items-stretch md:items-center gap-2 rounded-[4px] border hairline-border-strong bg-card p-1.5 doc-shadow"
          >
            {/* Search Text Field */}
            <div className="flex flex-1 items-center gap-2.5 px-3 py-1 border-b md:border-b-0 md:border-e hairline-border">
              <Search
                className="size-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <input
                id="searchInput"
                type="text"
                value={inputValue}
                data-testid="search-input"
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalInput(val);
                  if (onQueryChange) onQueryChange(val);
                }}
                placeholder={translate(
                  'ابحث في الأرشيف بالعنوان، المؤلف، الحقل الإداري، أو الفكرة...',
                  'Search the archive by title, author, field, or concept...'
                )}
                aria-label={t('searchLabel')}
                className="w-full bg-transparent py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {inputValue.length > 0 && (
                <button
                  type="button"
                  id="btnClearSearch"
                  data-testid="clear-search-btn"
                  onClick={() => {
                    setLocalInput('');
                    if (onQueryChange) onQueryChange('');
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={t('clearSearchAria')}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Category Selector + Editorial Submit Button */}
            <div className="flex items-center gap-1.5 px-1">
              {categories.length > 0 && onCategoryChange && (
                <select
                  value={category}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  aria-label={translate('تصنيف البحث', 'Search Category')}
                  className="h-9 flex-1 md:flex-initial max-w-full md:max-w-[180px] truncate rounded-[3px] border hairline-border bg-background px-2.5 text-xs font-medium text-foreground focus:outline-none cursor-pointer"
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
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-[3px] bg-foreground px-4 text-xs font-semibold text-background transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
              >
                <span>{translate('بحث في الفهرس', 'Search Index')}</span>
              </button>
            </div>
          </form>

          {/* Editorial Stats & Spotlight Strip */}
          <div className="hero-stats mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2.5">
              <span>
                <strong
                  id="booksCounter"
                  data-testid="stat-total-books"
                  className="font-mono font-semibold text-foreground tabular-nums"
                >
                  {loaded ? String(booksCount) : '—'}
                </strong>{' '}
                {t('txtStatBooks')}
              </span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>
                <strong
                  data-testid="stat-total-categories"
                  className="font-mono font-semibold text-foreground tabular-nums"
                >
                  {loaded ? String(categoriesCount) : '—'}
                </strong>{' '}
                {t('txtStatCats')}
              </span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span>
                <strong
                  data-testid="stat-archive-year"
                  className="font-mono font-semibold text-foreground tabular-nums"
                >
                  2026
                </strong>{' '}
                {t('txtStatYear')}
              </span>
              {visitsCount !== null && visitsCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-border">
                    ·
                  </span>
                  <span>
                    <strong className="font-mono font-semibold text-foreground tabular-nums">
                      {formatNumber(visitsCount)}
                    </strong>{' '}
                    {t('txtStatVisits')}
                  </span>
                </>
              )}
            </div>

            {onOpenSpotlight && (
              <button
                type="button"
                onClick={onOpenSpotlight}
                data-testid="hero-spotlight-trigger"
                className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary cursor-pointer"
              >
                <span className="font-sans">{t('spotlightSearch')}</span>
                <kbd className="rounded-[3px] border hairline-border bg-card px-1.5 py-0.5 text-[10px]">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
