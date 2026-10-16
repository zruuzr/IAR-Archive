/* ============================================================
   IAR Archive — event wiring
   All DOM event listeners in one place.
   ============================================================ */

import { $, $$, visible, attr, store } from './utils.js';
import { state } from './state.js';
import { t } from './i18n.js';
import { byId } from './data.js';
import { render, summary, categories, updateChips, readBook } from './render.js';
import { route, navigateBook, backToList, clearBundle } from './router.js';
import { download, cancelDownload } from './download.js';
import { rate } from './ratings.js';
import { copy, citation, share, toast, modal } from './ui-helpers.js';
import { language, theme } from './ui-init.js';
import { fetchBooks } from './data-fetch.js';

export function initEvents() {
  $('themeToggleBtn')?.addEventListener('click', () => {
    state.ui.theme = state.ui.theme === 'dark' ? 'light' : 'dark';
    store.set('iar_theme', state.ui.theme);
    theme();
  });

  $('langToggleBtn')?.addEventListener('click', () => {
    state.ui.lang = state.ui.lang === 'ar' ? 'en' : 'ar';
    store.set('iar_lang', state.ui.lang);
    language();
  });

  $('btnViewGrid')?.addEventListener('click', () => {
    state.ui.view = 'grid';
    store.set('iar_view_mode', 'grid');
    render();
  });

  $('btnViewList')?.addEventListener('click', () => {
    state.ui.view = 'list';
    store.set('iar_view_mode', 'list');
    render();
  });

  $('favoritesOnlyBtn')?.addEventListener('click', () => {
    state.filters.favoritesOnly = !state.filters.favoritesOnly;
    state.ui.page = 1;
    render();
  });

  let searchTimer;
  $('searchInput')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    state.filters.query = $('searchInput').value.trim();
    state.ui.page = 1;
    visible('btnClearSearch', !!state.filters.query);
    searchTimer = setTimeout(render, 200);
  });

  $('btnClearSearch')?.addEventListener('click', () => {
    clearTimeout(searchTimer);
    state.filters.query = '';
    if ($('searchInput')) $('searchInput').value = '';
    visible('btnClearSearch', false);
    state.ui.page = 1;
    render();
    $('searchInput')?.focus();
  });

  $('sortOrder')?.addEventListener('change', () => {
    state.ui.page = 1;
    render();
  });

  $('categoryChips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-category]');
    if (!chip) return;
    state.filters.category = chip.dataset.category;
    state.ui.page = 1;
    categories();
    render();
  });

  $('categoryChips')?.addEventListener('scroll', updateChips, { passive: true });
  window.addEventListener('resize', updateChips);

  $('chipsScrollLeft')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({
      left: state.ui.lang === 'ar' ? 220 : -220,
      behavior: 'smooth'
    })
  );

  $('chipsScrollRight')?.addEventListener('click', () =>
    $('categoryChips')?.scrollBy({
      left: state.ui.lang === 'ar' ? -220 : 220,
      behavior: 'smooth'
    })
  );

  $('paginationContainer')?.addEventListener('click', (e) => {
    const button = e.target.closest('[data-page]');
    if (!button || button.disabled) return;
    state.ui.page = Number(button.dataset.page);
    render();
    $('controlsRow')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('btnBackToList')?.addEventListener('click', backToList);

  document.querySelector('.brand-lockup')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearBundle();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('copyBundleBtn')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('book');
    url.searchParams.set('bundle', [...state.user.bundle].join(','));
    url.hash = '';
    copy(url.href);
  });

  $('clearBundleBtn')?.addEventListener('click', clearBundle);

  $('modalShareBtn')?.addEventListener('click', () => {
    const book = byId(state.ui.summary);
    if (book) share(book);
  });

  document.addEventListener('change', async (e) => {
    const input = e.target.closest('[data-action="bundle"]');
    if (!input) return;

    const id = Number(input.dataset.id);
    if (!byId(id)) return;

    input.checked ? state.user.bundle.add(id) : state.user.bundle.delete(id);

    $$(`input[data-action="bundle"][data-id="${id}"]`).forEach(
      (el) => (el.checked = input.checked)
    );

    if (state.user.bundleMode) {
      const url = new URL(location.href);
      url.searchParams.set('bundle', [...state.user.bundle].join(','));
      history.replaceState({}, '', url);
      render();
    } else {
      const { syncBundle } = await import('./render.js');
      syncBundle();
    }
  });

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-action]');
    if (!trigger) return;
    const name = trigger.dataset.action;
    if (name === 'bundle') return;

    if (trigger.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey))
      return;
    e.preventDefault();

    if (name === 'clear-bundle') {
      clearBundle();
      return;
    }
    if (name === 'retry') {
      fetchBooks();
      return;
    }
    if (name === 'reset') {
      state.filters.query = '';
      state.filters.category = 'all';
      state.filters.favoritesOnly = false;
      state.ui.page = 1;
      if ($('searchInput')) $('searchInput').value = '';
      visible('btnClearSearch', false);
      categories();
      render();
      return;
    }

    const book = byId(trigger.dataset.id);
    if (!book) return;

    switch (name) {
      case 'details':
        navigateBook(book);
        break;
      case 'read':
        readBook(book);
        break;
      case 'download':
        download(book);
        break;
      case 'summary':
        summary(book);
        break;
      case 'cite':
        copy(citation(book));
        break;
      case 'share':
        share(book);
        break;
      case 'rate':
        rate(book, Number(trigger.dataset.rating));
        break;
      case 'favorite': {
        const was = state.user.favorites.has(book.id);
        was ? state.user.favorites.delete(book.id) : state.user.favorites.add(book.id);
        store.set('iar_favorites', JSON.stringify([...state.user.favorites]));
        render();
        toast(
          was
            ? t('أزيل من المفضلة.', 'Removed from favorites.')
            : t('أضيف إلى المفضلة.', 'Added to favorites.')
        );
        break;
      }
      case 'cover': {
        attr('coverImageLarge', 'src', book.cover_image);
        attr('coverImageLarge', 'alt', book.title);
        modal.open('coverImageModal');
        break;
      }
    }
  });

  document.addEventListener(
    'error',
    (e) => {
      const img = e.target;
      if (img.tagName !== 'IMG') return;

      if (img.classList.contains('cover-img')) {
        img.hidden = true;
        if (img.nextElementSibling) img.nextElementSibling.hidden = false;
      } else if (img.id === 'singleBookCover') {
        img.hidden = true;
        const book = byId(state.ui.single);
        if (book && $('singleCoverFallback')) {
          $('singleCoverFallback').innerHTML = '';
        }
      }
    },
    true
  );

  window.addEventListener('popstate', route);

  $('dlCancel')?.addEventListener('click', cancelDownload);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const overlay = $('downloadOverlay');
    if (overlay && overlay.classList.contains('is-open')) {
      cancelDownload();
    }
  });
}
