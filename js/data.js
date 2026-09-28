/* ============================================================
   IAR Archive — data layer
   URL resolution, book normalization, lookups.
   ============================================================ */

import { clean, words } from './utils.js';
import { state } from './state.js';
import { t, field } from './i18n.js';

export function asset(value, pdf = false) {
  const raw = clean(value);
  if (!raw) return '';
  try {
    if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return '';
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      if (url.username || url.password) return '';
      if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
        url.hostname = 'raw.githubusercontent.com';
        url.pathname = url.pathname.replace('/blob/', '/');
      }
      return url.href;
    }
    const base = pdf
      ? 'https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/'
      : location.href;
    const url = new URL(raw.replace(/^\/+/, ''), base);
    return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function normalize(raw) {
  if (!raw || typeof raw !== 'object' || raw.id === '' || raw.id == null) return null;
  const id = Number(raw.id);
  if (!Number.isSafeInteger(id) || id < 0 || !clean(raw.title)) return null;

  const book = { id };
  [
    'title',
    'author',
    'category',
    'description',
    'publisher',
    'type',
    'target_audience',
    'badge_text'
  ].forEach((key) => {
    book[key] = clean(raw[key]);
    book[key + '_en'] = clean(raw[key + '_en']);
  });

  ['year', 'pages', 'file_size'].forEach((key) => (book[key] = clean(raw[key])));
  ['keywords', 'keywords_en', 'key_points', 'key_points_en'].forEach(
    (key) => (book[key] = words(raw[key]))
  );

  book.featured = raw.featured === true;
  book.cover_image = asset(raw.cover_image);
  book.file_path = asset(raw.file_path, true);

  let name =
    clean(raw.file_name) || clean(raw.file_path).split('/').pop()?.split('?')[0] || '';
  try {
    name = decodeURIComponent(name);
  } catch {}
  book.file_name = name.replace(/[\\/\u0000-\u001f]/g, '_') || `IAR-${id}.pdf`;

  book.downloadCount = 0;
  book.publicRating = 0;
  book.ratingSum = 0;
  book.ratingCount = 0;
  book.voters = [];
  return book;
}

export const byId = (id) => state.data.books.find((b) => b.id === Number(id));
export const categoryKey = (b) => b.category || '__general__';
export const categoryLabel = (b) => field(b, 'category') || t('عام', 'General');

export function points(book) {
  const list =
    state.ui.lang === 'en' && book.key_points_en.length
      ? book.key_points_en
      : book.key_points;

  return list.length
    ? list
    : [
        t(
          'لم يُرفق ملخص لهذا المرجع بعد.',
          'No summary has been provided for this reference yet.'
        )
      ];
}
