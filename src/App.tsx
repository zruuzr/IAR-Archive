import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CoverZoomDialog } from '@/components/features/CoverZoomDialog';
import { DownloadProgressDialog } from '@/components/features/DownloadProgressDialog';
import { PdfReaderDialog } from '@/components/features/PdfReaderDialog';
import { SpotlightSearchDialog } from '@/components/features/SpotlightSearchDialog';
import { SummaryDialog } from '@/components/features/SummaryDialog';
import { HeroAcademic } from '@/components/layout/HeroAcademic';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { TopAnnouncement } from '@/components/layout/TopAnnouncement';
import { BookDetailsView, BookNotFoundView } from '@/components/library/BookDetailsView';
import { BookGrid } from '@/components/library/BookGrid';
import { BundleBar } from '@/components/library/BundleBar';
import { CategoryPathways } from '@/components/library/CategoryPathways';
import { FeaturedSpotlight } from '@/components/library/FeaturedSpotlight';
import { PaginationNav } from '@/components/library/PaginationNav';
import { SearchAndControls } from '@/components/library/SearchAndControls';
import { useBookDownload } from '@/hooks/useBookDownload';
import { useCatalog, type UseCatalogOptions } from '@/hooks/useCatalog';
import { useLibraryState } from '@/hooks/useLibraryState';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { I18nProvider, useI18n } from '@/i18n/I18nProvider';
import { copyTextToClipboard, shareBookLink } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { findBookById, formatCitation } from '@/services/catalog';
import type { DownloadBookDeps } from '@/services/download';
import {
  computeNextRatingAggregate,
  getRatingResultMessage,
  hasUserRatedBook,
  isValidRatingValue,
  submitBookRating
} from '@/services/firebase-ratings';
import type { Book, Language } from '@/types/book';

export interface ToastNotice {
  id: number;
  message: string;
  isError: boolean;
}

export interface LibraryWorkspaceProps {
  catalogOptions?: UseCatalogOptions;
  downloadDeps?: DownloadBookDeps;
  recordDownloadMetrics?: boolean;
  recordRatingMetrics?: boolean;
  syncUrl?: boolean;
}

const LOCAL_SESSION_VOTER_UID = 'local-session-voter';

function isProductionBrowserRuntime(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  if (navigator.webdriver) {
    return false;
  }
  const host = window.location?.hostname ?? '';
  return (
    host === 'iararchive.web.app' ||
    host === 'iar-archive-328bc.web.app' ||
    host === 'iar-archive-328bc.firebaseapp.com'
  );
}

/**
 * Main IAR Archive Library Workspace ("Modern Bayt al-Hikma Academic Editorial").
 * Integrates the catalog service, normalized Arabic/English search, 114-category pathways,
 * custom research bundles, favorites, 3-minute summary modal, cover zoom modal,
 * interactive 1-5 star ratings, PDF.js reader modal, streaming PDF downloader, and PWA install.
 */
export function LibraryWorkspace({
  catalogOptions,
  downloadDeps,
  recordDownloadMetrics = isProductionBrowserRuntime(),
  recordRatingMetrics = isProductionBrowserRuntime(),
  syncUrl = true
}: LibraryWorkspaceProps = {}) {
  const { lang, dir, t, getBookField } = useI18n();

  const {
    books,
    loading,
    loaded,
    error,
    errorMessage,
    visitsCount,
    reload,
    updateBookMetrics
  } = useCatalog({
    autoLoadMetrics: isProductionBrowserRuntime(),
    ...catalogOptions
  });

  const {
    query,
    category,
    sort,
    viewMode,
    favoritesOnly,
    singleBook,
    requestedBookParam,
    isInvalidBookParam,
    catalogResult,
    categories,
    favorites,
    bundle,
    setQuery,
    clearSearch,
    setCategory,
    setSort,
    setViewMode,
    toggleFavoritesOnly,
    setPage,
    resetFilters,
    navigateBook,
    backToList,
    clearBundleAndReset
  } = useLibraryState({
    books,
    lang,
    syncUrl
  });

  const pwa = usePWAInstall({ lang });

  const [readerBook, setReaderBook] = useState<Book | null>(null);
  const [summaryBook, setSummaryBook] = useState<Book | null>(null);
  const [zoomCoverBook, setZoomCoverBook] = useState<Book | null>(null);
  const [spotlightOpen, setSpotlightOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const toastIdRef = useRef<number>(0);

  // Global keyboard shortcut: Ctrl+K or Cmd+K opens Spotlight Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSpotlightOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pushToast = useCallback((message: string, isError = false) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, isError }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const downloadState = useBookDownload({
    lang,
    recordMetrics: recordDownloadMetrics,
    deps: downloadDeps,
    onDownloadCountUpdated: (bookId, count) => {
      updateBookMetrics(bookId, { downloadCount: count });
    }
  });

  // Sync document title with active book or main library view
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (singleBook) {
      document.title = `${getBookField(singleBook, 'title')} | IAR Archive`;
    } else {
      document.title = 'IAR Archive | Iraqi Administrative Reference';
    }
  }, [singleBook, getBookField]);

  const handleReadBook = useCallback(
    (book: Book) => {
      if (!book.file_path) {
        pushToast(t('fileUnavailable'), true);
        return;
      }
      setSummaryBook(null);
      setZoomCoverBook(null);
      setReaderBook(book);
    },
    [pushToast, t]
  );

  const handleOpenSummary = useCallback((book: Book) => {
    setReaderBook(null);
    setZoomCoverBook(null);
    setSummaryBook(book);
  }, []);

  const handleZoomCover = useCallback((book: Book) => {
    setReaderBook(null);
    setSummaryBook(null);
    setZoomCoverBook(book);
  }, []);

  const handleOpenDetails = useCallback(
    (book: Book) => {
      setSummaryBook(null);
      setZoomCoverBook(null);
      navigateBook(book);
    },
    [navigateBook]
  );

  const handleDownloadBook = useCallback(
    (book: Book) => {
      if (!book.file_path) {
        pushToast(t('fileUnavailable'), true);
        return;
      }
      void downloadState.startDownload(book);
    },
    [downloadState, pushToast, t]
  );

  const handleToggleFavorite = useCallback(
    (bookId: number) => {
      const added = favorites.toggleFavorite(bookId);
      pushToast(added ? t('addedToFavoritesToast') : t('removedFromFavoritesToast'));
    },
    [favorites, pushToast, t]
  );

  const handleToggleBundle = useCallback(
    (bookId: number) => {
      bundle.toggleBundleItem(bookId);
    },
    [bundle]
  );

  const handleCopyCitation = useCallback(
    async (book: Book) => {
      const citationText = formatCitation(book, lang);
      const ok = await copyTextToClipboard(citationText);
      if (ok) {
        pushToast(t('copiedToClipboard'));
      }
    },
    [lang, pushToast, t]
  );

  const handleCopyBundleUrl = useCallback(
    async (url: string) => {
      const ok = await copyTextToClipboard(url);
      if (ok) {
        pushToast(t('copiedToClipboard'));
      }
    },
    [pushToast, t]
  );

  const handleShareBook = useCallback(
    async (book: Book) => {
      const outcome = await shareBookLink(book, lang);
      if (outcome === 'copied') {
        pushToast(t('copiedToClipboard'));
      }
    },
    [lang, pushToast, t]
  );

  const handleRateBook = useCallback(
    async (bookId: number, stars: number) => {
      if (!isValidRatingValue(stars)) {
        pushToast(getRatingResultMessage('INVALID_RATING', lang), true);
        return;
      }

      const targetBook = findBookById(books, bookId);
      if (!targetBook) return;

      if (recordRatingMetrics) {
        const result = await submitBookRating(bookId, stars, {
          book: targetBook,
          lang
        });
        if (result.ok && result.metricsPatch) {
          updateBookMetrics(bookId, result.metricsPatch);
          pushToast(result.message, false);
        } else {
          pushToast(result.message, true);
        }
        return;
      }

      // Safe local rating calculation (never pollutes production Firestore in dev/test)
      if (hasUserRatedBook(targetBook, LOCAL_SESSION_VOTER_UID)) {
        pushToast(getRatingResultMessage('ALREADY_VOTED', lang), true);
        return;
      }

      const nextAggregate = computeNextRatingAggregate(
        {
          ratingSum: targetBook.ratingSum,
          ratingCount: targetBook.ratingCount,
          voters: targetBook.voters
        },
        stars,
        LOCAL_SESSION_VOTER_UID
      );

      updateBookMetrics(bookId, {
        ratingSum: nextAggregate.ratingSum,
        ratingCount: nextAggregate.ratingCount,
        publicRating: nextAggregate.average,
        voters: nextAggregate.voters ?? [...targetBook.voters, LOCAL_SESSION_VOTER_UID]
      });
      pushToast(getRatingResultMessage('SAVED', lang), false);
    },
    [books, lang, pushToast, recordRatingMetrics, updateBookMetrics]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        const target = document.getElementById('controlsRow');
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [setPage]
  );

  const handleBrandClick = useCallback(() => {
    if (singleBook || isInvalidBookParam) {
      backToList();
    } else {
      resetFilters();
    }
  }, [singleBook, isInvalidBookParam, backToList, resetFilters]);

  return (
    <div
      dir={dir}
      data-testid="iar-library-app"
      className="min-h-dvh flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-foreground"
    >
      {/* Slim Institutional Top Bar */}
      <TopAnnouncement />

      {/* Main Sticky Header */}
      <SiteHeader
        favoritesOnly={favoritesOnly}
        favoritesCount={favorites.count}
        onToggleFavoritesOnly={() => {
          if (singleBook || isInvalidBookParam) {
            backToList();
          }
          toggleFavoritesOnly();
        }}
        onBrandClick={handleBrandClick}
        onOpenSpotlight={() => setSpotlightOpen(true)}
        pwa={pwa}
      />

      {/* Balanced Editorial Hero & Real Data Counters */}
      <HeroAcademic
        booksCount={books.length}
        categoriesCount={categories.length}
        visitsCount={visitsCount}
        loaded={loaded}
        onOpenSpotlight={() => setSpotlightOpen(true)}
        onSelectKeyword={(kw) => {
          if (singleBook || isInvalidBookParam) {
            backToList();
          }
          setQuery(kw);
          document.getElementById('controlsRow')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Library Content Area */}
      <main
        id="mainLibraryContent"
        className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-7 sm:px-6 sm:py-9 lg:px-8"
      >
        {singleBook ? (
          <BookDetailsView
            book={singleBook}
            isFavorite={favorites.isFavorite(singleBook.id)}
            isInBundle={bundle.isInBundle(singleBook.id)}
            isDownloadBusy={downloadState.isBusy(singleBook.id)}
            onBackToList={backToList}
            onRead={handleReadBook}
            onDownload={handleDownloadBook}
            onToggleFavorite={handleToggleFavorite}
            onToggleBundle={handleToggleBundle}
            onCopyCitation={(book) => {
              void handleCopyCitation(book);
            }}
            onShare={(book) => {
              void handleShareBook(book);
            }}
            onZoomCover={handleZoomCover}
            onRate={(bookId, stars) => {
              void handleRateBook(bookId, stars);
            }}
          />
        ) : isInvalidBookParam ? (
          <BookNotFoundView
            requestedParam={requestedBookParam}
            onBackToList={backToList}
          />
        ) : (
          <>
            {/* Research Bundle Bar & Shared Bundle Notice */}
            <BundleBar
              bundle={bundle}
              onCopyBundleUrl={handleCopyBundleUrl}
              onClearBundle={clearBundleAndReset}
            />

            {/* Featured Spotlight Reference (only on default view Page 1) */}
            {loaded && !error && catalogResult.spotlightBook && (
              <FeaturedSpotlight
                book={catalogResult.spotlightBook}
                isFavorite={favorites.isFavorite(catalogResult.spotlightBook.id)}
                isInBundle={bundle.isInBundle(catalogResult.spotlightBook.id)}
                isDownloadBusy={downloadState.isBusy(catalogResult.spotlightBook.id)}
                onRead={handleReadBook}
                onDownload={handleDownloadBook}
                onToggleFavorite={handleToggleFavorite}
                onToggleBundle={handleToggleBundle}
                onCopyCitation={(book) => {
                  void handleCopyCitation(book);
                }}
                onOpenDetails={handleOpenDetails}
                onOpenSummary={handleOpenSummary}
                onZoomCover={handleZoomCover}
                onShare={(book) => {
                  void handleShareBook(book);
                }}
                onRate={(bookId, stars) => {
                  void handleRateBook(bookId, stars);
                }}
              />
            )}

            {/* Search, Sort & View Controls */}
            <SearchAndControls
              query={query}
              category={category}
              sort={sort}
              viewMode={viewMode}
              favoritesOnly={favoritesOnly}
              totalMatching={catalogResult.totalFiltered}
              onQueryChange={setQuery}
              onClearSearch={clearSearch}
              onSortChange={setSort}
              onViewModeChange={setViewMode}
              onToggleFavoritesOnly={toggleFavoritesOnly}
              onResetFilters={resetFilters}
            />

            {/* 114-Category Pathways & Searchable Directory */}
            {loaded && !error && (
              <CategoryPathways
                books={books}
                categories={categories}
                activeCategory={category}
                onSelectCategory={setCategory}
              />
            )}

            {/* Main Reference Grid / List / Skeleton / Empty States */}
            <BookGrid
              books={catalogResult.pageBooks}
              loading={loading}
              error={error}
              errorMessage={errorMessage}
              viewMode={viewMode}
              favoritesOnly={favoritesOnly}
              favoritesSet={favorites.favoritesSet}
              bundleSet={bundle.bundleSet}
              isDownloadBusy={downloadState.isBusy}
              onRetry={() => {
                void reload();
              }}
              onResetFilters={resetFilters}
              onRead={handleReadBook}
              onDownload={handleDownloadBook}
              onToggleFavorite={handleToggleFavorite}
              onToggleBundle={handleToggleBundle}
              onCopyCitation={(book) => {
                void handleCopyCitation(book);
              }}
              onOpenDetails={handleOpenDetails}
              onOpenSummary={handleOpenSummary}
              onZoomCover={handleZoomCover}
              onShare={(book) => {
                void handleShareBook(book);
              }}
              onRate={(bookId, stars) => {
                void handleRateBook(bookId, stars);
              }}
            />

            {/* Accessible Pagination */}
            {loaded && !error && (
              <PaginationNav
                currentPage={catalogResult.currentPage}
                totalPages={catalogResult.totalPages}
                tokens={catalogResult.tokens}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </main>

      {/* Official Editorial Footer */}
      <SiteFooter />

      {/* 3-Minute Summary Modal */}
      <SummaryDialog
        book={summaryBook}
        open={summaryBook !== null}
        onOpenChange={(open) => {
          if (!open) setSummaryBook(null);
        }}
        onOpenFullDetails={handleOpenDetails}
        onRead={handleReadBook}
        onCopyCitation={(book) => {
          void handleCopyCitation(book);
        }}
        onCopySummary={(_book, summaryText) => {
          void copyTextToClipboard(summaryText).then((ok) => {
            if (ok) {
              pushToast(t('copiedToClipboard'));
            }
          });
        }}
        onShare={(book) => {
          void handleShareBook(book);
        }}
      />

      {/* Cover Preview & Zoom Modal */}
      <CoverZoomDialog
        book={zoomCoverBook}
        onClose={() => setZoomCoverBook(null)}
        onOpenDetails={
          singleBook && zoomCoverBook && singleBook.id === zoomCoverBook.id
            ? undefined
            : handleOpenDetails
        }
      />

      {/* PDF.js Reader Modal */}
      <PdfReaderDialog
        book={readerBook}
        open={readerBook !== null}
        onOpenChange={(open) => {
          if (!open) setReaderBook(null);
        }}
      />

      {/* Streaming Download Progress Overlay */}
      <DownloadProgressDialog downloadState={downloadState} />

      {/* Fast Spotlight Search Command Palette (Ctrl+K) */}
      <SpotlightSearchDialog
        open={spotlightOpen}
        onOpenChange={setSpotlightOpen}
        books={books}
        categories={categories}
        onSelectBook={handleOpenDetails}
        onSelectCategory={(catKey) => {
          if (singleBook || isInvalidBookParam) {
            backToList();
          }
          setCategory(catKey);
          document.getElementById('controlsRow')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Accessible Toast Notification Host */}
      {toasts.length > 0 && (
        <div
          id="notificationHost"
          data-testid="toast-host"
          className="fixed bottom-4 end-4 z-50 flex flex-col gap-2 max-w-xs sm:max-w-sm w-full px-4 sm:px-0 pointer-events-none"
        >
          {toasts.map((item) => (
            <div
              key={item.id}
              role={item.isError ? 'alert' : 'status'}
              data-testid="toast-notice"
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-medium shadow-lg backdrop-blur-xs',
                item.isError
                  ? 'border-destructive/50 bg-destructive text-destructive-foreground'
                  : 'border-primary/40 bg-card text-card-foreground'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.isError ? (
                  <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2
                    className="size-4 text-primary shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{item.message}</span>
              </div>
              <button
                type="button"
                aria-label={t('txtModalClose')}
                onClick={() => dismissToast(item.id)}
                className="inline-flex size-5 items-center justify-center rounded-sm opacity-75 hover:opacity-100 shrink-0"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface AppProps extends LibraryWorkspaceProps {
  initialLang?: Language;
}

export function App({ initialLang, ...workspaceProps }: AppProps = {}) {
  return (
    <I18nProvider initialLang={initialLang}>
      <LibraryWorkspace {...workspaceProps} />
    </I18nProvider>
  );
}

export default App;
