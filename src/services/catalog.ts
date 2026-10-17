/* ============================================================
   IAR Archive — Catalog Data Service
   TypeScript port of js/data.js, js/data-fetch.js (catalog loading),
   js/utils.js (pure data helpers), js/i18n.js (field lookup),
   and js/ui-helpers.js (APA citation).
   ============================================================ */

import type { Book, BookLocalizedField, Language } from '@/types/book';

export const GITHUB_RAW_BASE_URL =
  'https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/';

export const DEFAULT_CATALOG_URL = './books.json';
export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;
export const GENERAL_CATEGORY_KEY = '__general__';

const LOCALIZED_FIELDS: readonly BookLocalizedField[] = [
  'title',
  'author',
  'category',
  'description',
  'publisher',
  'type',
  'target_audience',
  'badge_text'
] as const;

export interface NormalizeBookOptions {
  baseHref?: string;
}

export interface LoadCatalogOptions extends NormalizeBookOptions {
  url?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

/**
 * Converts null/undefined to `""`, otherwise converts to string and trims whitespace.
 * Equivalent to `clean(v)` in `js/utils.js`.
 */
export function clean(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

/**
 * Coerces a value to a non-negative finite number, defaulting to `0`.
 * Equivalent to `finite(v)` in `js/utils.js`.
 */
export function finite(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

/**
 * Normalizes an array of values into a list of non-empty trimmed strings.
 * Equivalent to `words(v)` in `js/utils.js`.
 */
export function words(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

/**
 * Resolves cover images and PDF file paths while enforcing scheme and credential safety.
 * Equivalent to `asset(value, pdf = false)` in `js/data.js`.
 *
 * - Rejects non-http(s) schemes (`javascript:`, `data:`, `mailto:`, etc.).
 * - Rejects URLs containing embedded credentials (`username` or `password`).
 * - Rewrites `https://github.com/.../blob/...` to `https://raw.githubusercontent.com/.../...`.
 * - Resolves relative PDF paths against `GITHUB_RAW_BASE_URL`.
 * - Resolves relative non-PDF paths against `baseHref` or `location.href`.
 */
export function resolveAssetUrl(value: unknown, pdf = false, baseHref?: string): string {
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

    const fallbackBase =
      typeof location !== 'undefined' && location?.href
        ? location.href
        : 'http://localhost/';
    const base = pdf ? GITHUB_RAW_BASE_URL : (baseHref ?? fallbackBase);
    const url = new URL(raw.replace(/^\/+/, ''), base);
    return ['http:', 'https:', 'file:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export const asset = resolveAssetUrl;

/**
 * Normalizes a single raw book object from `books.json` into a `Book` record.
 * Returns `null` if the record is not an object, lacks a valid non-negative integer `id`,
 * or has an empty `title`.
 *
 * Equivalent to `normalize(raw)` in `js/data.js`.
 * Note: The second parameter accepts `NormalizeBookOptions | number` so `array.map(normalizeBook)`
 * works safely without treating the array index as options.
 */
export function normalizeBook(
  raw: unknown,
  options?: NormalizeBookOptions | number
): Book | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;

  if (
    record.id === '' ||
    record.id == null ||
    typeof record.id === 'boolean' ||
    (typeof record.id === 'string' && record.id.trim() === '')
  ) {
    return null;
  }

  const id = Number(record.id);
  if (!Number.isSafeInteger(id) || id < 0 || !clean(record.title)) return null;

  const baseHref =
    typeof options === 'object' && options !== null ? options.baseHref : undefined;

  const localized: Record<string, string> = {};
  for (const key of LOCALIZED_FIELDS) {
    localized[key] = clean(record[key]);
    localized[`${key}_en`] = clean(record[`${key}_en`]);
  }

  const year = clean(record.year);
  const pages = clean(record.pages);
  const file_size = clean(record.file_size);

  const keywords = words(record.keywords);
  const keywords_en = words(record.keywords_en);
  const key_points = words(record.key_points);
  const key_points_en = words(record.key_points_en);

  const featured = record.featured === true;
  const cover_image = resolveAssetUrl(record.cover_image, false, baseHref);
  const file_path = resolveAssetUrl(record.file_path, true, baseHref);

  let name =
    clean(record.file_name) ||
    clean(record.file_path).split('/').pop()?.split('?')[0] ||
    '';
  try {
    name = decodeURIComponent(name);
  } catch {
    // Preserve raw segment if percent-encoding is malformed
  }
  const sanitizedName = Array.from(name, (ch) =>
    ch === '/' || ch === '\\' || ch.charCodeAt(0) <= 0x1f ? '_' : ch
  ).join('');
  const file_name = sanitizedName || `IAR-${id}.pdf`;

  return {
    id,
    title: localized.title,
    title_en: localized.title_en,
    author: localized.author,
    author_en: localized.author_en,
    category: localized.category,
    category_en: localized.category_en,
    description: localized.description,
    description_en: localized.description_en,
    publisher: localized.publisher,
    publisher_en: localized.publisher_en,
    type: localized.type,
    type_en: localized.type_en,
    target_audience: localized.target_audience,
    target_audience_en: localized.target_audience_en,
    badge_text: localized.badge_text,
    badge_text_en: localized.badge_text_en,
    year,
    pages,
    file_size,
    keywords,
    keywords_en,
    key_points,
    key_points_en,
    featured,
    cover_image,
    file_path,
    file_name,
    downloadCount: 0,
    publicRating: 0,
    ratingSum: 0,
    ratingCount: 0,
    voters: []
  };
}

export const normalize = normalizeBook;

/**
 * Validates and normalizes an entire catalog payload from `books.json`,
 * filtering out invalid entries and deduplicating records by `id` (keeping first seen).
 *
 * Equivalent to the payload normalization logic in `fetchBooks()` in `js/data-fetch.js`.
 */
export function normalizeCatalog(
  payload: unknown,
  options?: NormalizeBookOptions
): Book[] {
  if (!Array.isArray(payload)) {
    throw new Error('books.json must contain an array');
  }

  const seenIds = new Set<number>();
  const books: Book[] = [];

  for (const item of payload) {
    const book = normalizeBook(item, options);
    if (!book || seenIds.has(book.id)) continue;
    seenIds.add(book.id);
    books.push(book);
  }

  return books;
}

/**
 * Loads `books.json` over HTTP, validates response status and payload shape,
 * and returns the normalized, deduplicated catalog.
 *
 * Never falls back to synthetic/mock data on failure.
 * Equivalent to the data-fetching portion of `fetchBooks()` in `js/data-fetch.js`.
 */
export async function loadCatalog(options: LoadCatalogOptions = {}): Promise<Book[]> {
  const {
    url = DEFAULT_CATALOG_URL,
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    signal,
    fetchImpl = globalThis.fetch,
    baseHref
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available in this environment');
  }

  const requestSignal =
    signal ??
    (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined);

  const response = await fetchImpl(url, {
    cache: 'no-cache',
    ...(requestSignal ? { signal: requestSignal } : {})
  });

  if (!response.ok) {
    throw new Error('books.json unavailable');
  }

  const payload: unknown = await response.json();
  return normalizeCatalog(payload, { baseHref });
}

export const fetchCatalog = loadCatalog;

/**
 * Finds a book in a normalized catalog array by numeric or string ID.
 * Equivalent to `byId(id)` in `js/data.js`.
 */
export function findBookById(
  books: readonly Book[],
  id: number | string | null | undefined
): Book | undefined {
  if (
    id === null ||
    id === undefined ||
    typeof id === 'boolean' ||
    (typeof id === 'string' && id.trim() === '')
  ) {
    return undefined;
  }
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId)) return undefined;
  return books.find((b) => b.id === numericId);
}

export const byId = findBookById;

/**
 * Returns the localized value for a bilingual book field, falling back to the Arabic field
 * when `lang === 'en'` and the `_en` field is empty.
 * Equivalent to `field(book, name)` in `js/i18n.js`.
 */
export function getBookField(
  book: Pick<Book, BookLocalizedField | `${BookLocalizedField}_en`>,
  name: BookLocalizedField,
  lang: Language = 'ar'
): string {
  const enKey = `${name}_en` as const;
  return lang === 'en' && book[enKey] ? book[enKey] : book[name];
}

export const field = getBookField;

/**
 * Returns the canonical category key used for filtering (`book.category || '__general__'`).
 * Equivalent to `categoryKey(b)` in `js/data.js`.
 */
export function getCategoryKey(book: Pick<Book, 'category'>): string {
  return book.category || GENERAL_CATEGORY_KEY;
}

export const categoryKey = getCategoryKey;

/**
 * Returns the localized category label (`getBookField(book, 'category', lang)` or `'عام'` / `'General'`).
 * Equivalent to `categoryLabel(b)` in `js/data.js`.
 */
export function getCategoryLabel(
  book: Pick<Book, 'category' | 'category_en'>,
  lang: Language = 'ar'
): string {
  const value = lang === 'en' && book.category_en ? book.category_en : book.category;
  if (value) return value;
  return lang === 'ar' ? 'عام' : 'General';
}

export const categoryLabel = getCategoryLabel;

/**
 * Returns the localized key points array for a book, or a single localized fallback message
 * when no key points exist.
 * Equivalent to `points(book)` in `js/data.js`.
 */
export function getBookKeyPoints(
  book: Pick<Book, 'key_points' | 'key_points_en'>,
  lang: Language = 'ar'
): string[] {
  const list =
    lang === 'en' && book.key_points_en.length ? book.key_points_en : book.key_points;

  if (list.length > 0) {
    return list;
  }

  return [
    lang === 'ar'
      ? 'لم يُرفق ملخص لهذا المرجع بعد.'
      : 'No summary has been provided for this reference yet.'
  ];
}

export const points = getBookKeyPoints;

/**
 * Formats an APA-style citation string for a book in the requested language.
 * Equivalent to `citation(book)` in `js/ui-helpers.js`.
 */
export function formatCitation(
  book: Pick<
    Book,
    'author' | 'author_en' | 'year' | 'title' | 'title_en' | 'publisher' | 'publisher_en'
  >,
  lang: Language = 'ar'
): string {
  const unknown = lang === 'ar' ? 'غير متوفر' : 'Not provided';
  const noDate = lang === 'ar' ? 'د.ت.' : 'n.d.';
  const author =
    (lang === 'en' && book.author_en ? book.author_en : book.author) || unknown;
  const title = lang === 'en' && book.title_en ? book.title_en : book.title;
  const publisher =
    (lang === 'en' && book.publisher_en ? book.publisher_en : book.publisher) || unknown;

  return `${author} (${book.year || noDate}).\n${title}.\n${publisher}.`;
}

export const citation = formatCitation;
