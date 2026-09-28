/* ============================================================
   IAR Archive — rendering layer
   Cards, featured, pagination, single view, summary, categories.
   ============================================================ */

import { $, esc, text, attr, visible } from './utils.js';
import { state } from './state.js';
import { t, field, number, i, labels } from './i18n.js';
import { byId, categoryKey, categoryLabel, points } from './data.js';
import { modal, citation, bookUrl, share, copy, toast } from './ui-helpers.js';
import { download, refreshCounts } from './download.js';
import { stars } from './ratings.js';

export function readBook(book) {
  if (!book.file_path) {
    return toast(t('ملف المرجع غير متاح.', 'Reference file unavailable.'), true);
  }
  text('modalBookTitle', field(book, 'title'));
  const frame = $('pdfFrame');
  if (!frame) return;
  const absoluteUrl = new URL(book.file_path, location.href).href;
  frame.src = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(absoluteUrl)}`;
  modal.open('pdfReaderModal');
}

const pdfModal = $('pdfReaderModal');
if (pdfModal) {
  const observer = new MutationObserver(() => {
    if (pdfModal.hidden) {
      const frame = $('pdfFrame');
      if (frame) frame.src = 'about:blank';
    }
  });
  observer.observe(pdfModal, { attributes: true, attributeFilter: ['hidden'] });
}

function cover(book, featured = false) {
  const title = esc(field(book, 'title'));
  const color = book.id % 5;
  const symbols = ['command', 'git-branch', 'layers', 'asterisk', 'circle'];

  const image = book.cover_image
    ? `<img class="cover-img" src="${esc(book.cover_image)}" alt="${title}" loading="${featured ? 'eager' : 'lazy'}">`
    : '';

  const fallback = `<span class="cover-placeholder designed-cover cover-tone-${color}" ${image ? 'hidden' : ''}>
    <span class="cover-edition">IAR / ${esc(book.year || 'ARCHIVE')}</span>
    <span class="cover-symbol" aria-hidden="true">${i(symbols[color])}</span>
    <span class="cover-name">${title}</span>
    <span class="cover-caption">IAR ARCHIVE</span>
  </span>`;

  return `<div class="cover-container ${featured ? 'featured-cover' : ''}">
    <button type="button" class="cover-btn" data-action="${book.cover_image ? 'cover' : 'details'}" data-id="${book.id}" aria-label="${esc(t('عرض', 'View'))}: ${title}">
      ${image}
      ${fallback}
    </button>
  </div>`;
}

function action(book, name, icon, label, primary = false, iconOnly = false) {
  const disabled = ['read', 'download'].includes(name) && !book.file_path;
  const pressed = name === 'favorite' ? `aria-pressed="${state.user.favorites.has(book.id)}"` : '';
  const count = name === 'download'
    ? `<span class="download-count" data-download-count="${book.id}">${number(book.downloadCount)}</span>`
    : '';

  return `<button type="button" class="btn ${primary ? 'btn-primary' : 'btn-ghost'}"
    data-action="${name}" data-id="${book.id}" ${disabled ? 'disabled' : ''}
    aria-label="${esc(label)}" title="${esc(label)}" ${pressed}>
    ${i(icon)}${iconOnly ? '' : `<span>${esc(label)}</span>`}${count}
  </button>`;
}

function actions(book) {
  const l = labels();
  const fav = state.user.favorites.has(book.id);

  return `<div class="book-actions">
    ${action(book, 'read', 'book', l.read)}
    ${action(book, 'download', 'download', l.download, true)}
    ${action(book, 'summary', 'zap', l.summary)}
    ${action(book, 'cite', 'quote', l.cite, false, true)}
    ${action(book, 'favorite',
      fav ? 'heart-filled' : 'heart',
      fav ? t('إزالة من المفضلة', 'Remove favorite') : t('إضافة إلى المفضلة', 'Add favorite'),
      false, true)}
    ${action(book, 'share', 'share', l.share, false, true)}
  </div>`;
}

function bookCard(book) {
  return `<article class="book-card">
    <div class="book-topline">
      <span class="badge-type">${esc(field(book, 'type') || t('مرجع إداري', 'Reference'))}</span>
      <label class="bundle-select">
        <input type="checkbox" data-action="bundle" data-id="${book.id}"
          ${state.user.bundle.has(book.id) ? 'checked' : ''}
          aria-label="${esc(t('أضف إلى الحزمة: ', 'Add to bundle: ') + field(book, 'title'))}">
        <span>${t('حزمة البحث', 'Bundle')}</span>
      </label>
    </div>
    <div class="book-main">
      ${cover(book)}
      <div class="book-info">
        <span class="badge-tag">${esc(categoryLabel(book))}</span>
        <h3 class="book-title">
          <a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">
            ${esc(field(book, 'title'))}
          </a>
        </h3>
        <p class="book-author">${esc(field(book, 'author') || labels().unknown)}</p>
        ${stars(book)}
        <div class="book-meta">
          <span class="meta-chip">${i('calendar')} ${esc(book.year || '—')}</span>
          <span class="meta-chip">${i('file-text')} ${esc(book.pages || '—')} ${t('صفحة', 'pages')}</span>
        </div>
      </div>
    </div>
    <p class="book-desc">${esc(field(book, 'description') || labels().unknown)}</p>
    ${actions(book)}
  </article>`;
}

function featured(book) {
  return `<article class="featured-card">
    <div class="featured-inner">
      <div class="featured-sweep" aria-hidden="true"></div>
      <div class="featured-layout">
        ${cover(book, true)}
        <div class="featured-copy">
          <span class="featured-badge">
            ${i('sparkles')}
            ${esc(field(book, 'badge_text') || t('في دائرة الضوء', 'In the spotlight'))}
          </span>
          <div class="featured-meta-row">
            <span class="badge-tag">${esc(categoryLabel(book))}</span>
            <span class="featured-index">01 / IAR SELECTION</span>
          </div>
          <h2>
            <a href="${esc(bookUrl(book.id))}" data-action="details" data-id="${book.id}">
              ${esc(field(book, 'title'))}
            </a>
          </h2>
          <p class="book-author">${esc(field(book, 'author'))}</p>
          <p class="book-desc">${esc(field(book, 'description'))}</p>
          ${stars(book)}
          ${actions(book)}
        </div>
      </div>
    </div>
  </article>`;
}

function filteredBooks() {
  const norm = v => v
    .toLocaleLowerCase(state.ui.lang)
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '');

  const query = norm(state.filters.query);

  const books = state.data.books.filter(book => {
    if (state.user.bundleMode && !state.user.bundle.has(book.id)) return false;
    if (state.filters.favoritesOnly && !state.user.favorites.has(book.id)) return false;
    if (state.filters.category !== 'all' && categoryKey(book) !== state.filters.category) return false;

    const haystack = ['title', 'author', 'publisher', 'description', 'category']
      .flatMap(key => [book[key], book[key + '_en']])
      .concat(book.keywords, book.keywords_en)
      .join(' ');

    return !query || norm(haystack).includes(query);
  });

  const titleSort = (a, b) => field(a, 'title').localeCompare(field(b, 'title'), state.ui.lang);

  const sorts = {
    default: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id,
    title: titleSort,
    year: (a, b) => Number(b.year || 0) - Number(a.year || 0),
    pages: (a, b) => Number(a.pages || 0) - Number(b.pages || 0),
    downloads: (a, b) => b.downloadCount - a.downloadCount,
    rating: (a, b) => b.publicRating - a.publicRating,
    favorites: (a, b) =>
      Number(state.user.favorites.has(b.id)) - Number(state.user.favorites.has(a.id)) || titleSort(a, b)
  };

  return books.sort(sorts[$('sortOrder')?.value] || sorts.default);
}

function pagination(total) {
  const nav = $('paginationContainer');
  if (!nav) return;
  nav.innerHTML = '';
  if (total <= 1) return;

  const values = [...new Set([
    1, total, state.ui.page - 1, state.ui.page, state.ui.page + 1,
    ...(state.ui.page < 4 ? [2, 3, 4, 5] : []),
    ...(state.ui.page > total - 3 ? [total - 4, total - 3, total - 2, total - 1] : [])
  ])]
    .filter(v => v > 0 && v <= total)
    .sort((a, b) => a - b);

  const button = (value, label, disabled = false, role = '') =>
    `<li class="page-item">
      <button type="button" class="page-btn ${value === state.ui.page ? 'active' : ''}"
        ${role ? `data-page-${role}` : ''}
        data-page="${value}" ${disabled ? 'disabled' : ''}
        ${value === state.ui.page ? 'aria-current="page"' : ''}>
        <span class="page-label">${label}</span>
      </button>
    </li>`;

  let html = button(state.ui.page - 1, t('السابق', 'Previous'), state.ui.page === 1, 'prev');
  let last = 0;

  values.forEach(value => {
    if (last && value - last > 1) {
      html += `<li class="page-item"><span class="page-ellipsis" aria-hidden="true">…</span></li>`;
    }
    html += button(value, number(value));
    last = value;
  });

  nav.innerHTML = html + button(state.ui.page + 1, t('التالي', 'Next'), state.ui.page === total, 'next');
}

export function syncBundle() {
  text('bundleCount', number(state.user.bundle.size));
  visible('bundleBar', state.user.bundle.size > 0 && state.ui.single === null);

  if ($('copyBundleBtn')) $('copyBundleBtn').disabled = state.user.bundle.size === 0;

  const host = $('bundleModeAlertContainer');
  visible('bundleModeAlertContainer', state.ui.single === null);
  if (!host) return;

  host.innerHTML = state.user.bundleMode
    ? `<div class="bundle-mode-notice">
        ${i('layers-filled')}
        <span>${t('حزمة بحثية مشتركة', 'Shared research bundle')} · ${number(state.user.bundle.size)}</span>
        <button type="button" class="btn btn-ghost" data-action="clear-bundle">
          ${t('العودة للمكتبة', 'Back to library')}
        </button>
      </div>`
    : '';
}

export function render() {
  if (state.ui.single !== null) { renderSingle(); return; }

  visible('singleBookView', false);
  ['booksDisplayContainer', 'controlsRow'].forEach(id => visible(id, true));

  document.querySelector('.chips-container')?.classList.remove('d-none');
  $('paginationContainer')?.parentElement?.classList.remove('d-none');

    syncBundle();

  // Sync search-derived UI (idempotent — works even if input handler missed)
  if ($('searchInput') && $('searchInput').value !== state.filters.query) {
    $('searchInput').value = state.filters.query;
  }
  visible('btnClearSearch', !!state.filters.query);

  if (!state.data.loaded) return;

  const books = filteredBooks();

  const isDefaultView =
    !state.filters.query &&
    state.filters.category === 'all' &&
    !state.user.bundleMode &&
    !state.filters.favoritesOnly;

  const featuredBook = isDefaultView ? books.find(b => b.featured) : null;
  const spotlight = isDefaultView && state.ui.page === 1 ? featuredBook : null;

  $('featuredSection').innerHTML = spotlight ? featured(spotlight) : '';

  const gridBooks = featuredBook
    ? books.filter(b => b.id !== featuredBook.id)
    : books;

  const size = 6;
  const total = Math.ceil(gridBooks.length / size);
  state.ui.page = Math.min(state.ui.page, Math.max(1, total));

  const page = gridBooks.slice((state.ui.page - 1) * size, state.ui.page * size);

  $('booksDisplayContainer').innerHTML = gridBooks.length
    ? `<div class="books-grid ${state.ui.view === 'list' ? 'is-list' : ''}">${page.map(bookCard).join('')}</div>`
    : `<div class="empty-state">
        ${i('search')}
        <h3>${t('لا توجد نتائج مطابقة', 'No matching references')}</h3>
        <p>${t('جرّب كلمات أخرى أو أعد ضبط خيارات العرض.', 'Try another search or reset your filters.')}</p>
        <button class="btn btn-primary" data-action="reset">${t('إعادة ضبط البحث', 'Reset filters')}</button>
      </div>`;

  pagination(total);
  refreshCounts();
  updateChips();

  $('btnViewGrid')?.classList.toggle('active', state.ui.view === 'grid');
  attr('btnViewGrid', 'aria-pressed', state.ui.view === 'grid');
  $('btnViewList')?.classList.toggle('active', state.ui.view === 'list');
  attr('btnViewList', 'aria-pressed', state.ui.view === 'list');
  $('favoritesOnlyBtn')?.classList.toggle('active', state.filters.favoritesOnly);
  attr('favoritesOnlyBtn', 'aria-pressed', state.filters.favoritesOnly);
}

export function categories() {
  const map = new Map();
  state.data.books.forEach(book => map.set(categoryKey(book), categoryLabel(book)));
  text('catCounter', number(map.size));

  const chips = $('categoryChips');
  if (!chips) return;

  chips.innerHTML = [['all', t('كل المراجع', 'All references')], ...map]
    .map(([key, label]) => `<button type="button" class="chip-item ${state.filters.category === key ? 'active' : ''}"
      data-category="${esc(key)}" aria-pressed="${state.filters.category === key}">${esc(label)}</button>`)
    .join('');

  requestAnimationFrame(updateChips);
}

export function updateChips() {
  const wrapper = $('categoryChips');
  if (!wrapper) return;
  const container = wrapper.closest('.chips-container');
  if (!container) return;

  const max = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
  const current = Math.min(max, Math.abs(wrapper.scrollLeft));
  const start = max > 5 && current > 5;
  const end = max > 5 && current < max - 5;

  $('chipsScrollLeft')?.classList.toggle('can-show', start);
  $('chipsScrollRight')?.classList.toggle('can-show', end);
}

export function metadata(book = null) {
  const title = book
    ? `${field(book, 'title')} | IAR Archive`
    : 'IAR Archive | Iraqi Administrative Reference';

  const description = book
    ? field(book, 'description')
    : t(
        'مساحة معرفية للمراجع الإدارية، والملخصات، والتوثيق الأكاديمي.',
        'A knowledge space for management references, summaries and academic citations.'
      );

  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description.slice(0, 160));
}

export function summary(book) {
  state.ui.summary = book.id;

  text('summaryBookTitle', field(book, 'title'));
  text('summaryBookAuthor', field(book, 'author'));
  text('summaryCategory', categoryLabel(book));
  text('summaryType', field(book, 'type'));
  text('summaryPages', `${book.pages || '—'} ${t('صفحة', 'pages')}`);
  text('summarySize', book.file_size || '—');
  text('summaryAudience', field(book, 'target_audience') || labels().unknown);
  text('summaryAPA', citation(book));

  const apa = $('summaryAPA');
  if (apa) apa.dir = 'auto';

  const list = $('summaryKeyPoints');
  if (list) list.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');

  modal.open('summaryModal');
}

export function renderSingle() {
  const book = byId(state.ui.single);
  if (!book) return;

  ['booksDisplayContainer', 'controlsRow', 'bundleBar', 'bundleModeAlertContainer']
    .forEach(id => visible(id, false));
  document.querySelector('.chips-container')?.classList.add('d-none');
  $('paginationContainer')?.parentElement?.classList.add('d-none');
  $('featuredSection').innerHTML = '';

  visible('singleBookView', true);

  const img = $('singleBookCover');
  if (img) {
    if (book.cover_image) {
      img.src = book.cover_image;
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute('src');
    }
    img.alt = field(book, 'title');
  }

  let fallback = $('singleCoverFallback');
  if (!fallback && img) {
    fallback = document.createElement('div');
    fallback.id = 'singleCoverFallback';
    img.parentElement.append(fallback);
  }
  if (fallback) fallback.innerHTML = book.cover_image ? '' : cover(book, true);

  text('singleBookTitle', field(book, 'title'));
  text('singleBookAuthor', field(book, 'author') || labels().unknown);
  text('singleBookCategory', categoryLabel(book));
  text('singleBookType', field(book, 'type'));
  text('singleBookDescription', field(book, 'description') || labels().unknown);
  text('singleBookAudience', field(book, 'target_audience') || labels().unknown);

  const kp = $('singleBookKeyPoints');
  if (kp) kp.innerHTML = points(book).map(p => `<li>${esc(p)}</li>`).join('');

  const starsContainer = $('singleBookStars');
  if (starsContainer) starsContainer.innerHTML = stars(book);

  text('singleDownloadCount', number(book.downloadCount));

  if ($('singleReadBtn')) {
    $('singleReadBtn').disabled = !book.file_path;
    $('singleReadBtn').onclick = () => readBook(book);
  }
  if ($('singleDownloadBtn')) {
    $('singleDownloadBtn').disabled = !book.file_path || state.meta.busyDownloads.has(book.id);
    $('singleDownloadBtn').onclick = () => download(book);
  }
  if ($('singleCiteBtn')) $('singleCiteBtn').onclick = () => copy(citation(book));
  if ($('singleShareBtn')) $('singleShareBtn').onclick = () => share(book);

  metadata(book);
  syncBundle();
}
