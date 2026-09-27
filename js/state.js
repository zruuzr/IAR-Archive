/* ============================================================
   IAR Archive — global state
   The single source of truth. Mutable object.
   ============================================================ */

import { store } from './utils.js';

export function savedArray(key) {
  try {
    const v = JSON.parse(store.get(key, '[]'));
    return Array.isArray(v) ? v.filter(Number.isSafeInteger) : [];
  } catch { return []; }
}

export const state = {
  data: { books: [], loaded: false, loading: true, error: false },
  ui: {
    lang: document.documentElement.lang === 'en' ? 'en' : 'ar',
    theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    view: store.get('iar_view_mode', 'grid') === 'list' ? 'list' : 'grid',
    page: 1,
    single: null,
    summary: null
  },
  filters: { query: '', category: 'all', favoritesOnly: false },
  user: {
    favorites: new Set(savedArray('iar_favorites')),
    bundle: new Set(),
    bundleMode: false
  },
  meta: {
    savedLibraryState: null,
    deferredPrompt: null,
    busyRatings: new Set(),
    busyDownloads: new Set(),
    downloadAbort: null
  }
};

export const DL_RING_CIRC = 2 * Math.PI * 88;
