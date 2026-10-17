import { useCallback, useMemo, useState } from 'react';
import { findBookById } from '@/services/catalog';
import type { Book } from '@/types/book';

/**
 * Builds a shareable URL for a single book (`?book=ID`), removing `bundle` and hash.
 * Equivalent to `bookUrl(id)` in `js/ui-helpers.js`.
 */
export function buildBookUrl(bookId: number, baseHref?: string): string {
  const currentHref =
    baseHref ??
    (typeof window !== 'undefined' && window.location?.href
      ? window.location.href
      : 'http://localhost/');
  const url = new URL(currentHref);
  url.searchParams.delete('bundle');
  url.searchParams.set('book', String(bookId));
  url.hash = '';
  return url.href;
}

/**
 * Builds a shareable URL for a research bundle (`?bundle=1,2,3`), removing `book` and hash.
 * Equivalent to the `copyBundleBtn` URL builder in `js/events.js`.
 */
export function buildBundleUrl(bundleIds: Iterable<number>, baseHref?: string): string {
  const currentHref =
    baseHref ??
    (typeof window !== 'undefined' && window.location?.href
      ? window.location.href
      : 'http://localhost/');
  const url = new URL(currentHref);
  url.searchParams.delete('book');
  url.searchParams.set('bundle', [...bundleIds].join(','));
  url.hash = '';
  return url.href;
}

function parseRawBundleSearch(search: string): {
  bundleMode: boolean;
  rawIds: number[];
} {
  const params = new URLSearchParams(search);
  const raw = params.get('bundle');
  if (raw === null) {
    return { bundleMode: false, rawIds: [] };
  }

  const uniqueIds = new Set<number>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const num = Number(trimmed);
    if (Number.isSafeInteger(num) && num >= 0) {
      uniqueIds.add(num);
    }
  }

  return {
    bundleMode: true,
    rawIds: [...uniqueIds]
  };
}

function readInitialBundleFromUrl(syncUrlOnMount: boolean): {
  bundleMode: boolean;
  rawIds: number[];
} {
  if (!syncUrlOnMount || typeof window === 'undefined' || !window.location) {
    return { bundleMode: false, rawIds: [] };
  }
  return parseRawBundleSearch(window.location.search);
}

function updateUrlBundleParam(bundleIds: readonly number[]): void {
  if (typeof window === 'undefined' || !window.location || !window.history) return;
  const url = new URL(window.location.href);
  url.searchParams.set('bundle', bundleIds.join(','));
  window.history.replaceState({}, '', url);
}

export interface UseBundleOptions {
  books: readonly Book[];
  syncUrlOnMount?: boolean;
}

export interface UseBundleReturn {
  bundleIds: readonly number[];
  bundleSet: ReadonlySet<number>;
  bundleMode: boolean;
  bundleCount: number;
  bundleShareUrl: string;
  isInBundle: (bookId: number) => boolean;
  addToBundle: (bookId: number) => void;
  removeFromBundle: (bookId: number) => void;
  toggleBundleItem: (bookId: number) => boolean;
  setBundleMode: (enabled: boolean) => void;
  syncBundleFromLocation: (search?: string) => void;
  clearBundle: (options?: { updateHistory?: boolean }) => void;
}

/**
 * Manages the in-memory research bundle selection and `?bundle=1,2,3` URL synchronization.
 * Matches `js/state.js`, `js/router.js`, and `js/events.js` (bundle selection is never stored in localStorage).
 */
export function useBundle({
  books,
  syncUrlOnMount = true
}: UseBundleOptions): UseBundleReturn {
  const [rawBundleIds, setRawBundleIds] = useState<readonly number[]>(
    () => readInitialBundleFromUrl(syncUrlOnMount).rawIds
  );
  const [bundleMode, setBundleMode] = useState<boolean>(
    () => readInitialBundleFromUrl(syncUrlOnMount).bundleMode
  );

  // Filter candidate IDs against actual catalog books when loaded
  const bundleIds = useMemo<readonly number[]>(() => {
    if (books.length === 0) return rawBundleIds;
    return rawBundleIds.filter((id) => Boolean(findBookById(books, id)));
  }, [books, rawBundleIds]);

  const bundleSet = useMemo(() => new Set<number>(bundleIds), [bundleIds]);

  const isInBundle = useCallback(
    (bookId: number): boolean => bundleSet.has(bookId),
    [bundleSet]
  );

  const isValidBookId = useCallback(
    (bookId: number): boolean => {
      if (!Number.isSafeInteger(bookId) || bookId < 0) return false;
      if (books.length === 0) return true;
      return Boolean(findBookById(books, bookId));
    },
    [books]
  );

  const syncBundleFromLocation = useCallback((search?: string) => {
    if (typeof window === 'undefined' && search === undefined) return;
    const rawSearch =
      search ?? (typeof window !== 'undefined' ? window.location.search : '');
    const parsed = parseRawBundleSearch(rawSearch);
    setBundleMode(parsed.bundleMode);
    if (parsed.bundleMode) {
      setRawBundleIds(parsed.rawIds);
    }
  }, []);

  const addToBundle = useCallback(
    (bookId: number) => {
      if (!isValidBookId(bookId)) return;
      setRawBundleIds((prev) => {
        const currentValid =
          books.length > 0 ? prev.filter((id) => Boolean(findBookById(books, id))) : prev;
        if (currentValid.includes(bookId)) return currentValid;
        const next = [...currentValid, bookId];
        if (bundleMode) {
          updateUrlBundleParam(next);
        }
        return next;
      });
    },
    [books, bundleMode, isValidBookId]
  );

  const removeFromBundle = useCallback(
    (bookId: number) => {
      setRawBundleIds((prev) => {
        const currentValid =
          books.length > 0 ? prev.filter((id) => Boolean(findBookById(books, id))) : prev;
        if (!currentValid.includes(bookId)) return currentValid;
        const next = currentValid.filter((id) => id !== bookId);
        if (bundleMode) {
          updateUrlBundleParam(next);
        }
        return next;
      });
    },
    [books, bundleMode]
  );

  const toggleBundleItem = useCallback(
    (bookId: number): boolean => {
      if (!isValidBookId(bookId)) return false;
      let isSelectedNow = false;
      setRawBundleIds((prev) => {
        const currentValid =
          books.length > 0 ? prev.filter((id) => Boolean(findBookById(books, id))) : prev;
        const exists = currentValid.includes(bookId);
        isSelectedNow = !exists;
        const next = exists
          ? currentValid.filter((id) => id !== bookId)
          : [...currentValid, bookId];
        if (bundleMode) {
          updateUrlBundleParam(next);
        }
        return next;
      });
      return isSelectedNow;
    },
    [books, bundleMode, isValidBookId]
  );

  const clearBundle = useCallback((options?: { updateHistory?: boolean }) => {
    const shouldUpdateHistory = options?.updateHistory ?? true;
    setBundleMode(false);
    setRawBundleIds([]);

    if (
      shouldUpdateHistory &&
      typeof window !== 'undefined' &&
      window.location &&
      window.history
    ) {
      const url = new URL(window.location.href);
      url.searchParams.delete('bundle');
      url.searchParams.delete('book');
      window.history.pushState({}, '', url);
    }
  }, []);

  const bundleShareUrl = useMemo(() => buildBundleUrl(bundleIds), [bundleIds]);

  return {
    bundleIds,
    bundleSet,
    bundleMode,
    bundleCount: bundleIds.length,
    bundleShareUrl,
    isInBundle,
    addToBundle,
    removeFromBundle,
    toggleBundleItem,
    setBundleMode,
    syncBundleFromLocation,
    clearBundle
  };
}
