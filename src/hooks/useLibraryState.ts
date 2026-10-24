import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ALL_CATEGORIES_KEY,
  DEFAULT_PAGE_SIZE,
  extractCategories,
  getCategoryChips,
  queryCatalog
} from '@/lib/catalog-query';
import { findBookById } from '@/services/catalog';
import type {
  Book,
  CatalogQueryResult,
  CategoryOption,
  Language,
  SortOrder
} from '@/types/book';
import { buildBookUrl, useBundle, type UseBundleReturn } from './useBundle';
import { useFavorites, type UseFavoritesReturn } from './useFavorites';

export type ViewMode = 'grid' | 'list' | 'workbench';

export const VIEW_MODE_STORAGE_KEY = 'iar_view_mode';

export interface SavedLibrarySnapshot {
  page: number;
  category: string;
  query: string;
  favoritesOnly: boolean;
  view: ViewMode;
}

export function readStoredViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored === 'list' || stored === 'workbench') return stored;
    return 'grid';
  } catch {
    return 'grid';
  }
}

function parseRawBookParam(search: string): string | null {
  const params = new URLSearchParams(search);
  const raw = params.get('book');
  if (raw === null || raw.trim() === '') return null;
  return raw.trim();
}

function parseRawBookId(search: string): number | null {
  const raw = parseRawBookParam(search);
  if (raw === null) return null;
  const numericId = Number(raw);
  if (!Number.isSafeInteger(numericId) || numericId < 0) return null;
  return numericId;
}

export function parseBookParamFromSearch(
  search: string,
  books: readonly Book[]
): number | null {
  const numericId = parseRawBookId(search);
  if (numericId === null) return null;
  return findBookById(books, numericId) ? numericId : null;
}

function readInitialBookIdFromUrl(syncUrl: boolean): number | null {
  if (!syncUrl || typeof window === 'undefined' || !window.location) {
    return null;
  }
  return parseRawBookId(window.location.search);
}

function readInitialBookParamFromUrl(syncUrl: boolean): string | null {
  if (!syncUrl || typeof window === 'undefined' || !window.location) {
    return null;
  }
  return parseRawBookParam(window.location.search);
}

export interface UseLibraryStateOptions {
  books: readonly Book[];
  lang?: Language;
  pageSize?: number;
  favorites?: UseFavoritesReturn;
  syncUrl?: boolean;
}

export interface UseLibraryStateReturn {
  // Filter, sort & view state
  query: string;
  category: string;
  sort: SortOrder;
  viewMode: ViewMode;
  favoritesOnly: boolean;
  page: number;
  pageSize: number;
  singleBookId: number | null;
  singleBook: Book | null;
  requestedBookParam: string | null;
  isInvalidBookParam: boolean;

  // Derived catalog results
  catalogResult: CatalogQueryResult;
  categories: CategoryOption[];
  categoryChips: CategoryOption[];

  // Integrated favorites & bundle controllers
  favorites: UseFavoritesReturn;
  bundle: UseBundleReturn;

  // State mutators
  setQuery: (nextQuery: string) => void;
  clearSearch: () => void;
  setCategory: (nextCategory: string) => void;
  setSort: (nextSort: SortOrder) => void;
  setViewMode: (nextView: ViewMode) => void;
  setFavoritesOnly: (enabled: boolean) => void;
  toggleFavoritesOnly: () => void;
  setPage: (nextPage: number) => void;
  resetFilters: () => void;

  // URL & navigation actions
  navigateBook: (bookOrId: Book | number) => void;
  backToList: () => void;
  clearBundleAndReset: () => void;
  syncFromLocation: (search?: string) => void;
}

export function useLibraryState({
  books,
  lang = 'ar',
  pageSize = DEFAULT_PAGE_SIZE,
  favorites: externalFavorites,
  syncUrl = true
}: UseLibraryStateOptions): UseLibraryStateReturn {
  const internalFavorites = useFavorites();
  const favorites = externalFavorites ?? internalFavorites;

  const bundle = useBundle({ books, syncUrlOnMount: syncUrl });

  const [query, setQueryState] = useState<string>('');
  const [category, setCategoryState] = useState<string>(ALL_CATEGORIES_KEY);
  const [sort, setSortState] = useState<SortOrder>('default');
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readStoredViewMode());
  const [favoritesOnly, setFavoritesOnlyState] = useState<boolean>(false);
  const [page, setPageState] = useState<number>(1);
  const [rawSingleBookId, setRawSingleBookId] = useState<number | null>(() =>
    readInitialBookIdFromUrl(syncUrl)
  );
  const [requestedBookParam, setRequestedBookParam] = useState<string | null>(() =>
    readInitialBookParamFromUrl(syncUrl)
  );

  const savedLibraryStateRef = useRef<SavedLibrarySnapshot | null>(null);

  const singleBook = useMemo<Book | null>(
    () =>
      rawSingleBookId !== null ? (findBookById(books, rawSingleBookId) ?? null) : null,
    [books, rawSingleBookId]
  );

  const singleBookId = singleBook ? singleBook.id : null;
  const isInvalidBookParam =
    requestedBookParam !== null && books.length > 0 && singleBook === null;

  const catalogResult = useMemo<CatalogQueryResult>(
    () =>
      queryCatalog(books, {
        query,
        category,
        favoritesOnly,
        favorites: favorites.favoritesSet,
        bundleMode: bundle.bundleMode,
        bundle: bundle.bundleSet,
        sort,
        page,
        pageSize,
        lang
      }),
    [
      books,
      query,
      category,
      favoritesOnly,
      favorites.favoritesSet,
      bundle.bundleMode,
      bundle.bundleSet,
      sort,
      page,
      pageSize,
      lang
    ]
  );

  const categories = useMemo<CategoryOption[]>(
    () => extractCategories(books, lang),
    [books, lang]
  );

  const categoryChips = useMemo<CategoryOption[]>(
    () => getCategoryChips(books, lang),
    [books, lang]
  );

  const restoreLibraryState = useCallback((): boolean => {
    const saved = savedLibraryStateRef.current;
    if (!saved) return false;
    if (typeof saved.page === 'number' && saved.page > 0) {
      setPageState(saved.page);
    }
    if (typeof saved.category === 'string') {
      setCategoryState(saved.category);
    }
    if (typeof saved.query === 'string') {
      setQueryState(saved.query);
    }
    if (typeof saved.favoritesOnly === 'boolean') {
      setFavoritesOnlyState(saved.favoritesOnly);
    }
    if (typeof saved.view === 'string') {
      setViewModeState(
        saved.view === 'list' || saved.view === 'workbench' ? saved.view : 'grid'
      );
    }
    savedLibraryStateRef.current = null;
    return true;
  }, []);

  const syncFromLocation = useCallback(
    (searchOverride?: string) => {
      if (typeof window === 'undefined' && searchOverride === undefined) return;
      const search =
        searchOverride ?? (typeof window !== 'undefined' ? window.location.search : '');

      const nextParam = parseRawBookParam(search);
      const nextSingle = parseBookParamFromSearch(search, books);
      setRequestedBookParam(nextParam);
      bundle.syncBundleFromLocation(search);

      setRawSingleBookId((prevSingle) => {
        const wasSingleValid =
          prevSingle !== null && Boolean(findBookById(books, prevSingle));
        if (nextSingle === null && wasSingleValid) {
          restoreLibraryState();
        } else if (nextSingle === null) {
          setPageState(1);
        }
        return nextSingle;
      });
    },
    [books, bundle, restoreLibraryState]
  );

  // Listen to browser Back/Forward navigation (popstate)
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return undefined;
    const handlePopState = () => {
      syncFromLocation(window.location.search);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncUrl, syncFromLocation]);

  // Listen to cross-tab storage changes for iar_view_mode
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== VIEW_MODE_STORAGE_KEY) return;
      setViewModeState(
        event.newValue === 'list' || event.newValue === 'workbench'
          ? event.newValue
          : 'grid'
      );
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery.trim());
    setPageState(1);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setPageState(1);
  }, []);

  const setCategory = useCallback((nextCategory: string) => {
    setCategoryState(nextCategory || ALL_CATEGORIES_KEY);
    setPageState(1);
  }, []);

  const setSort = useCallback((nextSort: SortOrder) => {
    setSortState(nextSort);
    setPageState(1);
  }, []);

  const setViewMode = useCallback((nextView: ViewMode) => {
    const normalized: ViewMode =
      nextView === 'list' || nextView === 'workbench' ? nextView : 'grid';
    setViewModeState(normalized);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage write errors
    }
  }, []);

  const setFavoritesOnly = useCallback((enabled: boolean) => {
    setFavoritesOnlyState(Boolean(enabled));
    setPageState(1);
  }, []);

  const toggleFavoritesOnly = useCallback(() => {
    setFavoritesOnlyState((prev) => !prev);
    setPageState(1);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    if (!Number.isFinite(nextPage)) return;
    setPageState(Math.max(1, Math.trunc(nextPage)));
  }, []);

  const resetFilters = useCallback(() => {
    setQueryState('');
    setCategoryState(ALL_CATEGORIES_KEY);
    setFavoritesOnlyState(false);
    setPageState(1);
  }, []);

  const navigateBook = useCallback(
    (bookOrId: Book | number) => {
      const targetId = typeof bookOrId === 'number' ? bookOrId : bookOrId.id;
      const targetBook = findBookById(books, targetId);
      if (!targetBook) return;

      if (singleBookId === null) {
        savedLibraryStateRef.current = {
          page: catalogResult.currentPage,
          category,
          query,
          favoritesOnly,
          view: viewMode
        };
      }

      if (syncUrl && typeof window !== 'undefined' && window.history) {
        window.history.pushState({}, '', buildBookUrl(targetBook.id));
      }

      setRequestedBookParam(String(targetBook.id));
      setRawSingleBookId(targetBook.id);
    },
    [
      books,
      singleBookId,
      catalogResult.currentPage,
      category,
      query,
      favoritesOnly,
      viewMode,
      syncUrl
    ]
  );

  const backToList = useCallback(() => {
    if (syncUrl && typeof window !== 'undefined' && window.location && window.history) {
      const url = new URL(window.location.href);
      url.searchParams.delete('book');
      window.history.replaceState({}, '', url);
    }

    setRequestedBookParam(null);
    setRawSingleBookId(null);
    restoreLibraryState();
  }, [syncUrl, restoreLibraryState]);

  const clearBundleAndReset = useCallback(() => {
    savedLibraryStateRef.current = null;
    setRequestedBookParam(null);
    setRawSingleBookId(null);
    setQueryState('');
    setCategoryState(ALL_CATEGORIES_KEY);
    setFavoritesOnlyState(false);
    setPageState(1);
    bundle.clearBundle({ updateHistory: syncUrl });
  }, [bundle, syncUrl]);

  return {
    query,
    category,
    sort,
    viewMode,
    favoritesOnly,
    page: catalogResult.currentPage,
    pageSize,
    singleBookId,
    singleBook,
    requestedBookParam,
    isInvalidBookParam,
    catalogResult,
    categories,
    categoryChips,
    favorites,
    bundle,
    setQuery,
    clearSearch,
    setCategory,
    setSort,
    setViewMode,
    setFavoritesOnly,
    toggleFavoritesOnly,
    setPage,
    resetFilters,
    navigateBook,
    backToList,
    clearBundleAndReset,
    syncFromLocation
  };
}
