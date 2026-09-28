/* ============================================================
   IAR Archive — routing
   URL state, book navigation, bundle mode, browser history.
   ============================================================ */

import { $, visible, motion } from './utils.js';
import { state } from './state.js';
import { byId } from './data.js';
import { bookUrl } from './ui-helpers.js';
import { render, renderSingle, metadata, categories } from './render.js';

export function navigateBook(book) {
  if (state.ui.single === null) {
    state.meta.savedLibraryState = {
      page: state.ui.page,
      category: state.filters.category,
      query: state.filters.query,
      favoritesOnly: state.filters.favoritesOnly,
      view: state.ui.view
    };
  }

  history.pushState({}, '', bookUrl(book.id));
  state.ui.single = book.id;
  renderSingle();
  window.scrollTo({ top: 0, behavior: motion() });
}

function restoreLibraryState() {
  if (!state.meta.savedLibraryState) return false;
  const s = state.meta.savedLibraryState;
  if (typeof s.page === 'number' && s.page > 0) state.ui.page = s.page;
  if (typeof s.category === 'string') state.filters.category = s.category;
  if (typeof s.query === 'string') state.filters.query = s.query;
  if (typeof s.favoritesOnly === 'boolean') state.filters.favoritesOnly = s.favoritesOnly;
  if (typeof s.view === 'string') state.ui.view = s.view === 'list' ? 'list' : 'grid';

  if ($('searchInput')) $('searchInput').value = state.filters.query;
  visible('btnClearSearch', !!state.filters.query);

  state.meta.savedLibraryState = null;
  return true;
}

export function backToList() {
  const url = new URL(location.href);
  url.searchParams.delete('book');
  history.replaceState({}, '', url);
  state.ui.single = null;
  restoreLibraryState();
  metadata();
  render();
}

export function route() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('book');
  const wasSingle = state.ui.single;

  state.ui.single =
    raw !== null &&
    raw.trim() !== '' &&
    Number.isSafeInteger(Number(raw)) &&
    byId(Number(raw))
      ? Number(raw)
      : null;

  const bundle = params.get('bundle');
  state.user.bundleMode = bundle !== null;

  if (bundle !== null) {
    state.user.bundle = new Set(
      bundle
        .split(',')
        .filter((v) => v.trim() !== '')
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && byId(id))
    );
  }

  if (!state.ui.single && wasSingle !== null) {
    restoreLibraryState();
  } else if (!state.ui.single) {
    state.ui.page = 1;
  }

  metadata();
  render();
}

export function clearBundle() {
  state.user.bundleMode = false;
  state.user.bundle.clear();
  state.ui.single = null;
  state.filters.query = '';
  state.filters.category = 'all';
  state.filters.favoritesOnly = false;
  state.ui.page = 1;

  if ($('searchInput')) $('searchInput').value = '';
  visible('btnClearSearch', false);

  const url = new URL(location.href);
  url.searchParams.delete('bundle');
  url.searchParams.delete('book');
  history.pushState({}, '', url);

  categories();
  metadata();
  render();
}
