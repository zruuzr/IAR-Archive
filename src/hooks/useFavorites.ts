import { useCallback, useEffect, useMemo, useState } from 'react';

export const FAVORITES_STORAGE_KEY = 'iar_favorites';

/**
 * Parses a raw JSON string from `localStorage` into a deduplicated array of safe integer IDs,
 * preserving insertion order.
 * Equivalent to `new Set(savedArray('iar_favorites'))` in `js/state.js`.
 */
export function parseFavoritesJson(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const unique = new Set<number>();
    for (const item of parsed) {
      if (typeof item === 'number' && Number.isSafeInteger(item)) {
        unique.add(item);
      }
    }
    return [...unique];
  } catch {
    return [];
  }
}

export function readStoredFavorites(): number[] {
  try {
    return parseFavoritesJson(localStorage.getItem(FAVORITES_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistFavorites(ids: readonly number[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage write errors
  }
}

export interface UseFavoritesReturn {
  favoriteIds: readonly number[];
  favoritesSet: ReadonlySet<number>;
  count: number;
  isFavorite: (bookId: number) => boolean;
  addFavorite: (bookId: number) => void;
  removeFavorite: (bookId: number) => void;
  toggleFavorite: (bookId: number) => boolean;
}

export function useFavorites(initialIds?: readonly number[]): UseFavoritesReturn {
  const [favoriteIds, setFavoriteIds] = useState<readonly number[]>(() => {
    if (initialIds) {
      return [...new Set(initialIds.filter((id) => Number.isSafeInteger(id)))];
    }
    return readStoredFavorites();
  });

  const favoritesSet = useMemo(() => new Set<number>(favoriteIds), [favoriteIds]);

  const isFavorite = useCallback(
    (bookId: number): boolean => favoritesSet.has(bookId),
    [favoritesSet]
  );

  const addFavorite = useCallback((bookId: number) => {
    if (!Number.isSafeInteger(bookId)) return;
    setFavoriteIds((prev) => {
      if (prev.includes(bookId)) return prev;
      const next = [...prev, bookId];
      persistFavorites(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((bookId: number) => {
    setFavoriteIds((prev) => {
      if (!prev.includes(bookId)) return prev;
      const next = prev.filter((id) => id !== bookId);
      persistFavorites(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((bookId: number): boolean => {
    if (!Number.isSafeInteger(bookId)) return false;
    let isNowFavorite = false;
    setFavoriteIds((prev) => {
      const exists = prev.includes(bookId);
      isNowFavorite = !exists;
      const next = exists ? prev.filter((id) => id !== bookId) : [...prev, bookId];
      persistFavorites(next);
      return next;
    });
    return isNowFavorite;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) return;
      setFavoriteIds(parseFavoritesJson(event.newValue));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    favoriteIds,
    favoritesSet,
    count: favoriteIds.length,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite
  };
}
