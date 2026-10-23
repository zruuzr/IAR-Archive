import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Heart,
  Layers,
  Loader2,
  Quote,
  RotateCcw,
  SearchX,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { copyTextToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { formatCitation, getBookKeyPoints, getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface ScholarWorkbenchProps {
  books: readonly Book[];
  loading: boolean;
  error: boolean;
  errorMessage?: string | null;
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
  onSearchKeyword?: (keyword: string) => void;
  initialSelectedId?: number | null;
}

type WorkbenchTab = 'summary' | 'citation' | 'contents' | 'notes';

function generateBibtex(book: Book, lang: 'ar' | 'en'): string {
  const author =
    (lang === 'en' && book.author_en ? book.author_en : book.author) || 'Institutional';
  const title = lang === 'en' && book.title_en ? book.title_en : book.title;
  const publisher =
    (lang === 'en' && book.publisher_en ? book.publisher_en : book.publisher) ||
    'Iraqi Administrative Reference Repository';
  const year = book.year || '2026';
  const key = `iar_${book.id}_${String(year).replace(/[^0-9]/g, '')}`;

  return `@misc{${key},
  title = {${title}},
  author = {${author}},
  year = {${year}},
  publisher = {${publisher}},
  url = {https://iararchive.web.app/?book=${book.id}}
}`;
}

/**
 * Isolated Researcher Notes Panel.
 * Remounted per book via `key={bookId}` to maintain idiomatic, effect-free local state.
 */
function ResearcherNotesPanel({ bookId }: { bookId: number }) {
  const { t, formatNumber } = useI18n();

  const [note, setNote] = useState<string>(() => {
    try {
      return localStorage.getItem(`iar_notes_${bookId}`) ?? '';
    } catch {
      return '';
    }
  });

  const [saved, setSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleNoteChange = (text: string) => {
    setNote(text);
    try {
      if (text.trim() === '') {
        localStorage.removeItem(`iar_notes_${bookId}`);
      } else {
        localStorage.setItem(`iar_notes_${bookId}`, text);
      }
      setSaved(true);
    } catch {
      // Ignore storage errors
    }
  };

  const handleClearNote = () => {
    setNote('');
    try {
      localStorage.removeItem(`iar_notes_${bookId}`);
    } catch {
      // Ignore
    }
  };

  const handleCopyNote = async () => {
    if (!note) return;
    const ok = await copyTextToClipboard(note);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;

  return (
    <div
      id="wb-panel-notes"
      role="tabpanel"
      aria-labelledby="wb-tab-notes"
      className="space-y-4 animate-in fade-in-50 duration-200"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <FileText className="size-3.5 text-primary" aria-hidden="true" />
          {t('workbenchTabNotes')}
        </span>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <Check className="size-3" aria-hidden="true" />
              {t('workbenchNotesAutoSaved')}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground font-mono">
            {formatNumber(wordCount)} {t('workbenchWords')} · {formatNumber(note.length)}{' '}
            {t('workbenchChars')}
          </span>
        </div>
      </div>

      <textarea
        data-testid="workbench-notes-textarea"
        value={note}
        onChange={(e) => handleNoteChange(e.target.value)}
        placeholder={t('workbenchNotesPlaceholder')}
        rows={10}
        className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all leading-relaxed custom-scrollbar shadow-inner"
      />

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!note.trim()}
          onClick={handleCopyNote}
          className="gap-1.5 text-xs font-semibold"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span className="text-emerald-600">{t('workbenchNotesCopied')}</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              <span>{t('workbenchCopyNotes')}</span>
            </>
          )}
        </Button>

        {note.trim() && (
          <button
            type="button"
            onClick={handleClearNote}
            className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="size-3" aria-hidden="true" />
            <span>{t('workbenchClearNotes')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Scholar's Dual-Pane Workbench ("محطة الباحث الأكاديمي المتزامنة").
 * Provides a synchronised master-detail layout where researchers can navigate
 * the reference stream and inspect comprehensive academic metadata, 3-minute summaries,
 * live APA & BibTeX citations, and personal research notes in a single unified view.
 */
export function ScholarWorkbench({
  books,
  loading,
  error,
  errorMessage,
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
  onZoomCover,
  onShare,
  onRate,
  onSearchKeyword,
  initialSelectedId
}: ScholarWorkbenchProps) {
  const { lang, t, getBookField, formatNumber } = useI18n();

  // User explicitly selected ID
  const [userSelectedId, setUserSelectedId] = useState<number | null>(
    () => initialSelectedId ?? null
  );

  // Derive activeBook directly during render without cascading useEffect
  const activeBook = useMemo(() => {
    if (books.length === 0) return null;
    if (userSelectedId !== null) {
      const match = books.find((b) => b.id === userSelectedId);
      if (match) return match;
    }
    return books[0] ?? null;
  }, [books, userSelectedId]);

  // Mobile sub-view: 'stream' (list of references) vs 'inspector' (selected reference details)
  const [mobileView, setMobileView] = useState<'stream' | 'inspector'>('stream');

  // Active tab in the academic inspector
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('summary');

  // Local feedback state for citation copy buttons
  const [copiedApa, setCopiedApa] = useState(false);
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  // Select book handler
  const handleSelectBook = (book: Book) => {
    setUserSelectedId(book.id);
    setMobileView('inspector');
  };

  // Keyboard navigation shortcuts
  const activeStreamIndex = useMemo(() => {
    if (!activeBook) return -1;
    return books.findIndex((b) => b.id === activeBook.id);
  }, [books, activeBook]);

  const selectNextBook = useCallback(() => {
    if (books.length === 0) return;
    const nextIndex = activeStreamIndex < books.length - 1 ? activeStreamIndex + 1 : 0;
    setUserSelectedId(books[nextIndex].id);
  }, [books, activeStreamIndex]);

  const selectPrevBook = useCallback(() => {
    if (books.length === 0) return;
    const prevIndex = activeStreamIndex > 0 ? activeStreamIndex - 1 : books.length - 1;
    setUserSelectedId(books[prevIndex].id);
  }, [books, activeStreamIndex]);

  // Global keyboard listener when focus is outside form fields
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        selectNextBook();
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        selectPrevBook();
      } else if (e.key === '1') {
        setActiveTab('summary');
      } else if (e.key === '2') {
        setActiveTab('citation');
      } else if (e.key === '3') {
        setActiveTab('contents');
      } else if (e.key === '4') {
        setActiveTab('notes');
      } else if ((e.key === 'c' || e.key === 'C') && activeBook) {
        onCopyCitation(activeBook);
      } else if ((e.key === 'd' || e.key === 'D') && activeBook) {
        onDownload(activeBook);
      } else if ((e.key === 'r' || e.key === 'R') && activeBook) {
        onRead(activeBook);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNextBook, selectPrevBook, activeBook, onCopyCitation, onDownload, onRead]);

  // Stream item ref to auto-scroll active into view
  const activeItemRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (
      activeItemRef.current &&
      typeof activeItemRef.current.scrollIntoView === 'function'
    ) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeBook?.id]);

  /* -------------------------------------------------------------
     Loading State Skeleton
  ------------------------------------------------------------- */
  if (loading) {
    return (
      <div
        id="booksDisplayContainer"
        role="status"
        aria-live="polite"
        data-testid="catalog-loading-skeleton"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
      >
        <div className="lg:col-span-5 h-[650px] bg-card rounded-2xl border border-border p-4 animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-xl"></div>
          ))}
        </div>
        <div className="lg:col-span-7 h-[650px] bg-card rounded-2xl border border-border p-6 animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="w-24 h-32 bg-muted rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted/60 rounded w-1/2"></div>
            </div>
          </div>
          <div className="h-10 bg-muted/40 rounded-xl"></div>
          <div className="h-48 bg-muted/30 rounded-xl"></div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     Error State
  ------------------------------------------------------------- */
  if (error) {
    return (
      <div
        id="booksDisplayContainer"
        data-testid="catalog-error-state"
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4 max-w-xl mx-auto my-8"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">{t('errorLoadTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {errorMessage || t('errorLoadBody')}
          </p>
        </div>
        <Button
          type="button"
          onClick={onRetry}
          data-testid="catalog-retry-btn"
          className="gap-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('retry')}
        </Button>
      </div>
    );
  }

  /* -------------------------------------------------------------
     Empty State (Zero Matching References)
  ------------------------------------------------------------- */
  if (books.length === 0) {
    return (
      <div
        id="booksDisplayContainer"
        data-testid="catalog-empty-state"
        className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-xl mx-auto my-8"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <SearchX className="size-7" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-foreground">
            {t('noMatchingReferencesTitle')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t('noMatchingReferencesBody')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onResetFilters}
          data-testid="reset-filters-btn"
          className="gap-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('resetFilters')}
        </Button>
      </div>
    );
  }

  const activeKeyPoints = activeBook ? getBookKeyPoints(activeBook, lang) : [];
  const activeCitation = activeBook ? formatCitation(activeBook, lang) : '';
  const activeBibtex = activeBook ? generateBibtex(activeBook, lang) : '';

  return (
    <div
      id="booksDisplayContainer"
      data-testid="books-grid"
      data-view-mode="workbench"
      className="space-y-4"
    >
      {/* Mobile Segmented Switcher (Visible on screens < lg) */}
      <div
        data-testid="workbench-mobile-switcher"
        className="lg:hidden flex items-center justify-between bg-card rounded-xl border border-border p-1 shadow-2xs"
      >
        <button
          type="button"
          data-testid="workbench-mobile-tab-stream"
          onClick={() => setMobileView('stream')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
            mobileView === 'stream'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Layers className="size-3.5" aria-hidden="true" />
          <span>{t('workbenchStreamTitle')}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-background/20 rounded-full">
            {formatNumber(books.length)}
          </span>
        </button>

        <button
          type="button"
          data-testid="workbench-mobile-tab-inspector"
          onClick={() => setMobileView('inspector')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 truncate px-2',
            mobileView === 'inspector'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="size-3.5" aria-hidden="true" />
          <span className="truncate">
            {activeBook
              ? getBookField(activeBook, 'title')
              : t('workbenchInspectorTitle')}
          </span>
        </button>
      </div>

      {/* Main Dual-Pane Container */}
      <div
        data-testid="scholar-workbench"
        className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
      >
        {/* =========================================================
            PANE 1: REFERENCE STREAM (Column 1, 5/12 or 4/12 width)
        ========================================================= */}
        <div
          className={cn(
            'lg:col-span-5 xl:col-span-4 flex flex-col bg-card rounded-2xl border border-border shadow-xs overflow-hidden h-[740px]',
            mobileView === 'inspector' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {/* Stream Header */}
          <div className="p-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-foreground">
                {t('workbenchStreamTitle')}
              </span>
              <span className="text-[11px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                {formatNumber(books.length)} {t('allReferences')}
              </span>
            </div>

            {/* Quick Next/Prev Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={selectPrevBook}
                aria-label={t('previous')}
                title={t('previous')}
                className="size-7 rounded-md border border-border bg-background hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {lang === 'ar' ? (
                  <ChevronRight className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronLeft className="size-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={selectNextBook}
                aria-label={t('next')}
                title={t('next')}
                className="size-7 rounded-md border border-border bg-background hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {lang === 'ar' ? (
                  <ChevronLeft className="size-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Stream Scrollable List */}
          <div
            role="listbox"
            aria-label={t('workbenchStreamTitle')}
            className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar"
          >
            {books.map((book) => {
              const isSelected = activeBook?.id === book.id;
              const isFav = favoritesSet.has(book.id);
              const inBnd = bundleSet.has(book.id);
              const categoryLabel = getCategoryLabel(book, lang);

              return (
                <div
                  key={book.id}
                  ref={isSelected ? activeItemRef : undefined}
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`workbench-stream-item-${book.id}`}
                  data-selected={isSelected}
                  onClick={() => handleSelectBook(book)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer relative group text-start',
                    isSelected
                      ? 'border-primary bg-primary/8 shadow-md shadow-primary/10 ring-1 ring-primary/25'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40 shadow-2xs'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Compact 3D Cover Thumbnail */}
                    <div className="w-13 h-18 shrink-0 relative rounded-md overflow-hidden shadow-sm book-cover-tactile">
                      <BookCover
                        book={book}
                        className="w-full h-full object-cover"
                        onClick={() => handleSelectBook(book)}
                      />
                    </div>

                    {/* Metadata Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground truncate max-w-[150px]">
                            {categoryLabel}
                          </span>
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                            {book.year || '2026'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-foreground leading-snug line-clamp-2">
                          {getBookField(book, 'title')}
                        </h4>

                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {getBookField(book, 'author') ||
                            getBookField(book, 'publisher')}
                        </p>
                      </div>

                      {/* Footer indicators */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-1.5 mt-1.5">
                        <span className="flex items-center gap-1 text-primary font-semibold">
                          ★{' '}
                          {book.ratingCount
                            ? Number(book.publicRating).toFixed(1)
                            : '5.0'}
                          <span className="text-muted-foreground font-normal">
                            ({book.pages || 0} ص)
                          </span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {inBnd && (
                            <span
                              className="size-2 rounded-full bg-primary"
                              title={t('workbenchInBundle')}
                            ></span>
                          )}
                          {isFav && (
                            <Heart
                              className="size-3 text-rose-500 fill-rose-500"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Indicator Bar on Side */}
                  {isSelected && (
                    <div className="absolute top-1/2 -translate-y-1/2 rtl:-right-1 ltr:-left-1 w-1.5 h-8 bg-primary rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stream Footer Hint */}
          <div className="p-2 border-t border-border bg-muted/20 text-[10px] text-muted-foreground text-center font-mono">
            {t('workbenchShortcutsHint')}
          </div>
        </div>

        {/* =========================================================
            PANE 2: MASTER ACADEMIC INSPECTOR (Column 2, 7/12 or 8/12)
        ========================================================= */}
        <div
          data-testid="workbench-inspector"
          className={cn(
            'lg:col-span-7 xl:col-span-8 flex flex-col bg-card rounded-2xl border border-border shadow-xs overflow-hidden h-[740px]',
            mobileView === 'stream' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {activeBook ? (
            <>
              {/* Back to stream button on mobile */}
              <div className="lg:hidden p-3 border-b border-border bg-muted/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileView('stream')}
                  className="gap-2 text-xs font-bold w-full justify-start text-primary"
                >
                  {lang === 'ar' ? (
                    <ChevronRight className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  )}
                  {t('workbenchBackToStream')}
                </Button>
              </div>

              {/* Inspector Header Stage */}
              <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-b from-muted/30 via-background to-card flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                <div className="flex gap-4 items-start">
                  {/* Large 3D Cover */}
                  <div className="w-22 sm:w-26 h-30 sm:h-36 shrink-0 relative rounded-xl overflow-hidden shadow-md book-cover-tactile border border-border">
                    <BookCover
                      book={activeBook}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => onZoomCover?.(activeBook)}
                    />
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        {getCategoryLabel(activeBook, lang)}
                      </span>
                      {activeBook.badge_text && (
                        <span className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          {getBookField(activeBook, 'badge_text')}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-muted-foreground">
                        #{activeBook.id}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg xl:text-xl font-extrabold text-foreground leading-snug">
                      {getBookField(activeBook, 'title')}
                    </h2>

                    <p className="text-xs text-muted-foreground font-medium">
                      {getBookField(activeBook, 'author') ||
                        getBookField(activeBook, 'publisher')}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-primary" aria-hidden="true" />
                        <strong className="text-foreground">
                          {activeBook.year || '2026'}
                        </strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5 text-primary" aria-hidden="true" />
                        <strong className="text-foreground">
                          {activeBook.pages || '—'} {lang === 'ar' ? 'صفحة' : 'pages'}
                        </strong>
                      </span>
                      {activeBook.file_size && (
                        <span className="text-[11px] font-mono">
                          {activeBook.file_size}
                        </span>
                      )}
                    </div>

                    {/* Interactive Ratings */}
                    <div className="pt-1">
                      <RatingStars book={activeBook} onRate={onRate} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-col gap-2 shrink-0 sm:w-44">
                  <Button
                    type="button"
                    onClick={() => onDownload(activeBook)}
                    disabled={isDownloadBusy(activeBook.id)}
                    className="w-full gap-2 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isDownloadBusy(activeBook.id) ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="size-4" aria-hidden="true" />
                    )}
                    {t('workbenchOfficialDownload')}
                  </Button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRead(activeBook)}
                      className="text-xs font-semibold gap-1"
                    >
                      <BookOpen className="size-3.5" aria-hidden="true" />
                      {t('workbenchQuickRead')}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleBundle(activeBook.id)}
                      className={cn(
                        'text-xs font-semibold gap-1',
                        bundleSet.has(activeBook.id) &&
                          'border-primary bg-primary/10 text-primary'
                      )}
                    >
                      <Layers className="size-3.5" aria-hidden="true" />
                      {bundleSet.has(activeBook.id)
                        ? t('workbenchInBundle')
                        : t('workbenchAddToBundle')}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(activeBook.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    >
                      <Heart
                        className={cn(
                          'size-4',
                          favoritesSet.has(activeBook.id)
                            ? 'text-rose-500 fill-rose-500'
                            : 'text-muted-foreground'
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-[11px]">{t('favorite')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onShare?.(activeBook)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                    >
                      <Share2
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-[11px]">{t('share')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenDetails(activeBook)}
                      className="flex items-center gap-1 text-xs text-primary font-bold hover:underline p-1 cursor-pointer"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      <span className="text-[11px]">{t('view')}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inspector Navigation Tabs */}
              <div
                role="tablist"
                aria-label={t('workbenchInspectorTitle')}
                className="px-4 border-b border-border bg-muted/20 flex items-center justify-between overflow-x-auto"
              >
                <div className="flex items-center gap-2 sm:gap-6">
                  <button
                    type="button"
                    role="tab"
                    id="wb-tab-summary"
                    data-testid="workbench-tab-summary"
                    aria-selected={activeTab === 'summary'}
                    aria-controls="wb-panel-summary"
                    onClick={() => setActiveTab('summary')}
                    className={cn(
                      'py-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      activeTab === 'summary'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    <span>{t('workbenchTabSummary')}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="wb-tab-citation"
                    data-testid="workbench-tab-citation"
                    aria-selected={activeTab === 'citation'}
                    aria-controls="wb-panel-citation"
                    onClick={() => setActiveTab('citation')}
                    className={cn(
                      'py-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      activeTab === 'citation'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Quote className="size-3.5" aria-hidden="true" />
                    <span>{t('workbenchTabCitation')}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="wb-tab-contents"
                    data-testid="workbench-tab-contents"
                    aria-selected={activeTab === 'contents'}
                    aria-controls="wb-panel-contents"
                    onClick={() => setActiveTab('contents')}
                    className={cn(
                      'py-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      activeTab === 'contents'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Tag className="size-3.5" aria-hidden="true" />
                    <span>{t('workbenchTabContents')}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id="wb-tab-notes"
                    data-testid="workbench-tab-notes"
                    aria-selected={activeTab === 'notes'}
                    aria-controls="wb-panel-notes"
                    onClick={() => setActiveTab('notes')}
                    className={cn(
                      'py-3 font-bold text-xs flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      activeTab === 'notes'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <FileText className="size-3.5" aria-hidden="true" />
                    <span>{t('workbenchTabNotes')}</span>
                  </button>
                </div>
              </div>

              {/* Inspector Tab Panels (Scrollable Content Body) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-card">
                {/* 1. EXECUTIVE SUMMARY PANEL */}
                {activeTab === 'summary' && (
                  <div
                    id="wb-panel-summary"
                    role="tabpanel"
                    aria-labelledby="wb-tab-summary"
                    className="space-y-5 animate-in fade-in-50 duration-200"
                  >
                    {/* Summary Narrative Box */}
                    <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="size-4 text-primary" aria-hidden="true" />
                          {t('summary')}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          3 min read
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {getBookField(activeBook, 'description') ||
                          t('noSummaryProvided')}
                      </p>
                    </div>

                    {/* Target Audience Box */}
                    {activeBook.target_audience && (
                      <div className="p-3.5 rounded-xl border border-border bg-card flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Users className="size-4" aria-hidden="true" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-muted-foreground block mb-0.5">
                            {t('workbenchTargetAudience')}
                          </span>
                          <p className="text-xs font-semibold text-foreground">
                            {getBookField(activeBook, 'target_audience')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Key Takeaways */}
                    <div className="space-y-2.5">
                      <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
                        <span className="size-2 rounded-full bg-primary"></span>
                        {t('workbenchKeyTakeaways')}
                      </h4>
                      <ul className="space-y-2 text-xs text-foreground/80">
                        {activeKeyPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary font-bold shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 2. ACADEMIC CITATION PANEL */}
                {activeTab === 'citation' && (
                  <div
                    id="wb-panel-citation"
                    role="tabpanel"
                    aria-labelledby="wb-tab-citation"
                    className="space-y-5 animate-in fade-in-50 duration-200"
                  >
                    {/* APA Citation Box */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {t('txtModalApaTitle')} (7th Edition)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const ok = await copyTextToClipboard(activeCitation);
                            if (ok) {
                              setCopiedApa(true);
                              setTimeout(() => setCopiedApa(false), 2000);
                            }
                          }}
                          className="h-8 gap-1.5 text-xs text-primary font-bold hover:bg-primary/10"
                        >
                          {copiedApa ? (
                            <>
                              <Check
                                className="size-3.5 text-emerald-600"
                                aria-hidden="true"
                              />
                              <span className="text-emerald-600">
                                {t('workbenchCitationCopied')}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" aria-hidden="true" />
                              <span>{t('workbenchCopyCitation')}</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <pre
                        dir="ltr"
                        className="text-xs font-mono bg-background p-3 rounded-lg border border-border overflow-x-auto text-foreground whitespace-pre-wrap select-all"
                      >
                        {activeCitation}
                      </pre>
                    </div>

                    {/* BibTeX Box for Papers & LaTeX */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {t('workbenchBibtexTitle')}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            const ok = await copyTextToClipboard(activeBibtex);
                            if (ok) {
                              setCopiedBibtex(true);
                              setTimeout(() => setCopiedBibtex(false), 2000);
                            }
                          }}
                          className="h-8 gap-1.5 text-xs text-primary font-bold hover:bg-primary/10"
                        >
                          {copiedBibtex ? (
                            <>
                              <Check
                                className="size-3.5 text-emerald-600"
                                aria-hidden="true"
                              />
                              <span className="text-emerald-600">
                                {t('workbenchCitationCopied')}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" aria-hidden="true" />
                              <span>{t('workbenchCopyBibtex')}</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <pre
                        dir="ltr"
                        className="text-[11px] font-mono bg-background p-3 rounded-lg border border-border overflow-x-auto text-muted-foreground whitespace-pre-wrap select-all"
                      >
                        {activeBibtex}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 3. CONTENTS & CONCEPTS PANEL */}
                {activeTab === 'contents' && (
                  <div
                    id="wb-panel-contents"
                    role="tabpanel"
                    aria-labelledby="wb-tab-contents"
                    className="space-y-5 animate-in fade-in-50 duration-200"
                  >
                    {/* Keywords & Concepts Chips */}
                    {activeBook.keywords.length > 0 ? (
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Tag className="size-3.5 text-primary" aria-hidden="true" />
                          {t('workbenchRelatedKeywords')}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(lang === 'en' && activeBook.keywords_en.length
                            ? activeBook.keywords_en
                            : activeBook.keywords
                          ).map((kw, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onSearchKeyword?.(kw)}
                              className="px-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 hover:border-primary/50 hover:bg-primary/10 text-foreground transition-colors font-medium cursor-pointer"
                            >
                              #{kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
                        {t('workbenchNoContents')}
                      </p>
                    )}
                  </div>
                )}

                {/* 4. RESEARCH NOTES (LOCAL STORAGE PERSISTED) */}
                {activeTab === 'notes' && (
                  <ResearcherNotesPanel key={activeBook.id} bookId={activeBook.id} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <BookOpen
                className="size-12 text-muted-foreground/40 mb-3"
                aria-hidden="true"
              />
              <p className="text-xs max-w-xs">{t('workbenchSelectHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
