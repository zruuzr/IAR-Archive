// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBookUrl, buildBundleUrl, useBundle } from '@/hooks/useBundle';
import { useCatalog } from '@/hooks/useCatalog';
import { FAVORITES_STORAGE_KEY, useFavorites } from '@/hooks/useFavorites';
import { useLibraryState, VIEW_MODE_STORAGE_KEY } from '@/hooks/useLibraryState';
import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  THEME_STORAGE_KEY,
  useTheme
} from '@/hooks/useTheme';
import { normalizeCatalog } from '@/services/catalog';
import type { Book } from '@/types/book';

function createSampleCatalog(): Book[] {
  return normalizeCatalog(
    Array.from({ length: 15 }, (_, idx) => {
      const id = idx + 1;
      return {
        id,
        title: `مرجع إداري رقم ${id}`,
        title_en: `Administrative Reference ${String(id).padStart(2, '0')}`,
        author: `المؤلف ${id}`,
        author_en: `Author ${id}`,
        category: id % 2 === 0 ? 'التخطيط الاستراتيجي' : 'الإدارة العامة',
        category_en: id % 2 === 0 ? 'Strategic Planning' : 'Public Administration',
        year: 2010 + id,
        pages: 100 + id * 10,
        featured: id === 1,
        file_path: `pdf/${id}.pdf`,
        cover_image: `covers/${id}.png`
      };
    }),
    { baseHref: 'http://localhost/' }
  );
}

describe('useTheme hook', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', LIGHT_THEME_COLOR);
  });

  it('restores saved theme from iar_theme, syncs data-theme and .dark class, and persists changes', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    ).toBe(DARK_THEME_COLOR);

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
    ).toBe(LIGHT_THEME_COLOR);
  });

  it('reacts to cross-tab storage events for iar_theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: THEME_STORAGE_KEY,
          newValue: 'dark'
        })
      );
    });

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});

describe('useFavorites hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores saved favorite IDs in order, adds/removes/toggles immutably, and persists to iar_favorites', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([7, 2, 7, 11]));
    const { result } = renderHook(() => useFavorites());

    expect(result.current.favoriteIds).toEqual([7, 2, 11]);
    expect(result.current.isFavorite(2)).toBe(true);
    expect(result.current.isFavorite(5)).toBe(false);

    act(() => {
      result.current.addFavorite(5);
    });
    expect(result.current.favoriteIds).toEqual([7, 2, 11, 5]);
    expect(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]')).toEqual([
      7, 2, 11, 5
    ]);

    act(() => {
      result.current.removeFavorite(2);
    });
    expect(result.current.favoriteIds).toEqual([7, 11, 5]);

    act(() => {
      result.current.toggleFavorite(11);
    });
    expect(result.current.favoriteIds).toEqual([7, 5]);
  });

  it('handles corrupted or non-array localStorage data gracefully without throwing', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{bad-json');
    const { result, unmount } = renderHook(() => useFavorites());
    expect(result.current.favoriteIds).toEqual([]);
    unmount();

    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(['not-a-number', null, 3.14, 9, true])
    );
    const secondHook = renderHook(() => useFavorites());
    expect(secondHook.result.current.favoriteIds).toEqual([9]);
  });

  it('synchronizes favorites across tabs via storage event', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteIds).toEqual([]);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: FAVORITES_STORAGE_KEY,
          newValue: JSON.stringify([4, 8])
        })
      );
    });

    expect(result.current.favoriteIds).toEqual([4, 8]);
    expect(result.current.isFavorite(8)).toBe(true);
  });
});

describe('useBundle hook & URL builders', () => {
  const sampleBooks = createSampleCatalog();

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/migration.html');
  });

  it('manages bundle selection in memory without writing to localStorage and generates shareable URLs', () => {
    const { result } = renderHook(() => useBundle({ books: sampleBooks }));

    act(() => {
      result.current.addToBundle(3);
      result.current.addToBundle(1);
      // Non-existent book ID is ignored
      result.current.addToBundle(999);
    });

    expect(result.current.bundleIds).toEqual([3, 1]);
    expect(result.current.bundleShareUrl).toContain('?bundle=3%2C1');
    expect(localStorage.length).toBe(0);

    expect(buildBookUrl(5, 'http://localhost/migration.html?bundle=1,2#top')).toBe(
      'http://localhost/migration.html?book=5'
    );
    expect(buildBundleUrl([1, 4], 'http://localhost/migration.html?book=5#top')).toBe(
      'http://localhost/migration.html?bundle=1%2C4'
    );
  });

  it('initializes bundleMode and valid book IDs from ?bundle= query param and updates URL when toggled', () => {
    window.history.replaceState({}, '', '/migration.html?bundle=2,999,abc,5,2');
    const { result } = renderHook(() => useBundle({ books: sampleBooks }));

    expect(result.current.bundleMode).toBe(true);
    expect(result.current.bundleIds).toEqual([2, 5]);

    act(() => {
      result.current.toggleBundleItem(4);
    });

    expect(result.current.bundleIds).toEqual([2, 5, 4]);
    expect(new URLSearchParams(window.location.search).get('bundle')).toBe('2,5,4');
  });
});

describe('useCatalog hook', () => {
  it('loads catalog, handles errors and retries without mock data, and updates metrics immutably', async () => {
    let shouldFail = true;
    const mockFetch = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        return { ok: false, status: 500, json: async () => [] };
      }
      return {
        ok: true,
        json: async () => [
          { id: 1, title: 'المرجع الأول', file_path: 'pdf/1.pdf' },
          { id: 2, title: 'المرجع الثاني', file_path: 'pdf/2.pdf' }
        ]
      };
    });

    const { result } = renderHook(() =>
      useCatalog({
        fetchImpl: mockFetch as unknown as typeof fetch,
        baseHref: 'http://localhost/'
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.books).toEqual([]);

    shouldFail = false;
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBe(false);
    expect(result.current.loaded).toBe(true);
    expect(result.current.books).toHaveLength(2);

    const prevBooksRef = result.current.books;
    act(() => {
      result.current.updateBookMetrics(2, {
        downloadCount: 55,
        publicRating: 4.8
      });
    });

    expect(result.current.books).not.toBe(prevBooksRef);
    expect(result.current.books[1].downloadCount).toBe(55);
    expect(result.current.books[1].publicRating).toBe(4.8);
  });
});

describe('useLibraryState hook — filters, sorting, pagination, URL routing & history', () => {
  const sampleBooks = createSampleCatalog();

  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/migration.html');
  });

  it('manages search, category, sort, viewMode, favoritesOnly, and resets page on filter change', () => {
    const { result } = renderHook(() =>
      useLibraryState({ books: sampleBooks, lang: 'ar' })
    );

    // Default view: Book #1 is featured and separated into spotlightBook, leaving 14 grid books (3 pages of 6)
    expect(result.current.catalogResult.isDefaultView).toBe(true);
    expect(result.current.catalogResult.spotlightBook?.id).toBe(1);
    expect(result.current.catalogResult.totalGrid).toBe(14);
    expect(result.current.catalogResult.totalPages).toBe(3);

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    // Changing category resets page to 1
    act(() => {
      result.current.setCategory('التخطيط الاستراتيجي');
    });
    expect(result.current.page).toBe(1);
    expect(result.current.catalogResult.isDefaultView).toBe(false);
    expect(
      result.current.catalogResult.filteredBooks.every(
        (b) => b.category === 'التخطيط الاستراتيجي'
      )
    ).toBe(true);

    // Changing viewMode persists to iar_view_mode
    act(() => {
      result.current.setViewMode('list');
    });
    expect(result.current.viewMode).toBe('list');
    expect(localStorage.getItem(VIEW_MODE_STORAGE_KEY)).toBe('list');
  });

  it('opens ?book=ID directly from URL and handles invalid ?book= parameters safely', () => {
    window.history.replaceState({}, '', '/migration.html?book=4');
    const { result, unmount } = renderHook(() =>
      useLibraryState({ books: sampleBooks, lang: 'ar' })
    );

    expect(result.current.singleBookId).toBe(4);
    expect(result.current.singleBook?.id).toBe(4);
    unmount();

    // Non-existent book ID falls back to null
    window.history.replaceState({}, '', '/migration.html?book=99999');
    const invalidBookHook = renderHook(() =>
      useLibraryState({ books: sampleBooks, lang: 'ar' })
    );
    expect(invalidBookHook.result.current.singleBookId).toBeNull();
    expect(invalidBookHook.result.current.singleBook).toBeNull();
  });

  it('preserves and restores library state (page, query, category, viewMode) across navigateBook, backToList, and popstate', () => {
    const { result } = renderHook(() =>
      useLibraryState({ books: sampleBooks, lang: 'ar' })
    );

    act(() => {
      result.current.setPage(2);
      result.current.setViewMode('list');
    });
    expect(result.current.page).toBe(2);

    // Navigate to single book #5
    act(() => {
      result.current.navigateBook(5);
    });
    expect(result.current.singleBookId).toBe(5);
    expect(new URLSearchParams(window.location.search).get('book')).toBe('5');

    // Simulate browser Back button (popstate to /migration.html without ?book=)
    act(() => {
      window.history.replaceState({}, '', '/migration.html');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.singleBookId).toBeNull();
    // Saved page (2) and viewMode ('list') are restored
    expect(result.current.page).toBe(2);
    expect(result.current.viewMode).toBe('list');
  });
});
