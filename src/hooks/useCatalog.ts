import { useCallback, useEffect, useRef, useState } from 'react';
import { loadCatalog, type LoadCatalogOptions } from '@/services/catalog';
import {
  loadCatalogMetrics,
  mergeMetricsIntoBooks,
  mergeSingleBookMetrics,
  type CatalogMetricsSnapshot,
  type LoadCatalogMetricsOptions
} from '@/services/firebase-metrics';
import type { Book, BookMetrics } from '@/types/book';

export interface UseCatalogOptions extends LoadCatalogOptions {
  initialBooks?: readonly Book[];
  autoLoad?: boolean;
  autoLoadMetrics?: boolean;
  metricsOptions?: LoadCatalogMetricsOptions;
  metricsLoader?: (
    options?: LoadCatalogMetricsOptions
  ) => Promise<CatalogMetricsSnapshot>;
}

export interface UseCatalogReturn {
  books: readonly Book[];
  loading: boolean;
  loaded: boolean;
  error: boolean;
  errorMessage: string | null;
  metricsLoaded: boolean;
  visitsCount: number | null;
  reload: () => Promise<void>;
  setBooks: (nextBooks: readonly Book[]) => void;
  updateBookInState: (bookId: number, patch: Partial<Book>) => void;
  updateBookMetrics: (bookId: number, metricsPatch: Partial<BookMetrics>) => void;
  updateAllBookMetrics: (
    metricsByBookId:
      ReadonlyMap<number, Partial<BookMetrics>> | Record<number, Partial<BookMetrics>>
  ) => void;
  syncMetrics: (
    overrideOptions?: LoadCatalogMetricsOptions
  ) => Promise<CatalogMetricsSnapshot>;
}

/**
 * Loads and manages the reference catalog from `books.json` without using mock fallback data.
 *
 * Maintains strict separation between:
 * 1. Loading `books.json` (`loadCatalog`)
 * 2. Loading Firestore metrics (`syncMetrics` / `loadCatalogMetrics`)
 * 3. Updating single or bulk book metrics immutably (`updateBookInState`, `updateBookMetrics`, `updateAllBookMetrics`)
 *
 * Failure of Firebase metrics never blocks or clears the loaded `books.json` catalog.
 */
export function useCatalog(options: UseCatalogOptions = {}): UseCatalogReturn {
  const {
    initialBooks,
    autoLoad = !initialBooks,
    autoLoadMetrics = false,
    metricsOptions,
    metricsLoader = loadCatalogMetrics,
    url,
    timeoutMs,
    baseHref,
    fetchImpl
  } = options;

  const [books, setBooksState] = useState<readonly Book[]>(() =>
    initialBooks ? [...initialBooks] : []
  );
  const [loading, setLoading] = useState<boolean>(() =>
    Boolean(autoLoad && !initialBooks)
  );
  const [loaded, setLoaded] = useState<boolean>(() => Boolean(initialBooks));
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metricsLoaded, setMetricsLoaded] = useState<boolean>(false);
  const [visitsCount, setVisitsCount] = useState<number | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateBookInState = useCallback((bookId: number, patch: Partial<Book>) => {
    setBooksState((prev) => {
      let changed = false;
      const next = prev.map((book) => {
        if (book.id !== bookId) return book;
        changed = true;
        return {
          ...book,
          ...patch,
          keywords: patch.keywords ? [...patch.keywords] : book.keywords,
          keywords_en: patch.keywords_en ? [...patch.keywords_en] : book.keywords_en,
          key_points: patch.key_points ? [...patch.key_points] : book.key_points,
          key_points_en: patch.key_points_en
            ? [...patch.key_points_en]
            : book.key_points_en,
          voters: patch.voters ? [...patch.voters] : book.voters
        };
      });
      return changed ? next : prev;
    });
  }, []);

  const updateBookMetrics = useCallback(
    (bookId: number, metricsPatch: Partial<BookMetrics>) => {
      setBooksState((prev) => mergeSingleBookMetrics(prev, bookId, metricsPatch));
    },
    []
  );

  const updateAllBookMetrics = useCallback(
    (
      metricsByBookId:
        ReadonlyMap<number, Partial<BookMetrics>> | Record<number, Partial<BookMetrics>>
    ) => {
      setBooksState((prev) => mergeMetricsIntoBooks(prev, metricsByBookId));
    },
    []
  );

  const syncMetrics = useCallback(
    async (
      overrideOptions?: LoadCatalogMetricsOptions
    ): Promise<CatalogMetricsSnapshot> => {
      try {
        const snapshot = await metricsLoader({
          ...metricsOptions,
          ...overrideOptions
        });
        if (!mountedRef.current) return snapshot;

        if (snapshot.byBookId.size > 0) {
          setBooksState((prev) => mergeMetricsIntoBooks(prev, snapshot.byBookId));
        }
        if (snapshot.visitsCount !== null) {
          setVisitsCount(snapshot.visitsCount);
        }
        if (snapshot.ratingsLoaded || snapshot.downloadsLoaded) {
          setMetricsLoaded(true);
        }
        return snapshot;
      } catch (err) {
        return {
          byBookId: new Map(),
          ratingsLoaded: false,
          downloadsLoaded: false,
          visitsCount: null,
          firebaseReady: false,
          authenticated: false,
          errors: [err instanceof Error ? err.message : 'Metrics sync failed']
        };
      }
    },
    [metricsLoader, metricsOptions]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    setLoaded(false);
    setErrorMessage(null);

    try {
      const catalog = await loadCatalog({
        url,
        timeoutMs,
        baseHref,
        fetchImpl
      });
      if (!mountedRef.current) return;
      setBooksState(catalog);
      setLoaded(true);
      setLoading(false);

      if (autoLoadMetrics) {
        void syncMetrics();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setLoading(false);
      setError(true);
      setLoaded(false);
      setErrorMessage(err instanceof Error ? err.message : 'books.json unavailable');
    }
  }, [url, timeoutMs, baseHref, fetchImpl, autoLoadMetrics, syncMetrics]);

  useEffect(() => {
    if (!autoLoad) return undefined;
    let cancelled = false;

    loadCatalog({
      url,
      timeoutMs,
      baseHref,
      fetchImpl
    })
      .then((catalog) => {
        if (cancelled || !mountedRef.current) return;
        setBooksState(catalog);
        setLoaded(true);
        setLoading(false);
        setError(false);
        setErrorMessage(null);

        if (autoLoadMetrics) {
          void syncMetrics();
        }
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        setLoading(false);
        setError(true);
        setLoaded(false);
        setErrorMessage(err instanceof Error ? err.message : 'books.json unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [autoLoad, autoLoadMetrics, url, timeoutMs, baseHref, fetchImpl, syncMetrics]);

  const setBooks = useCallback((nextBooks: readonly Book[]) => {
    setBooksState([...nextBooks]);
    setLoaded(true);
    setLoading(false);
    setError(false);
    setErrorMessage(null);
  }, []);

  return {
    books,
    loading,
    loaded,
    error,
    errorMessage,
    metricsLoaded,
    visitsCount,
    reload,
    setBooks,
    updateBookInState,
    updateBookMetrics,
    updateAllBookMetrics,
    syncMetrics
  };
}
