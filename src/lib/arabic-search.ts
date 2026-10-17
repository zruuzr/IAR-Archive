/* ============================================================
   IAR Archive — Arabic & Bilingual Search Normalization
   TypeScript port of the text normalization and haystack matching
   logic in js/render.js (filteredBooks).
   ============================================================ */

import type { Book, Language } from '@/types/book';

/**
 * Matches Arabic tashkeel (U+064B..U+0652), combining maddah/hamza above/below
 * produced by NFKD decomposition (U+0653..U+0655), extended Arabic marks (U+0656..U+065F),
 * and superscript alef (U+0670).
 */
export const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

/**
 * Matches Arabic tatweel / kashida (U+0640).
 */
export const ARABIC_TATWEEL_REGEX = /\u0640/g;

export const SEARCHABLE_BILINGUAL_FIELDS = [
  'title',
  'author',
  'publisher',
  'description',
  'category'
] as const;

export type SearchableBook = Pick<
  Book,
  | 'title'
  | 'title_en'
  | 'author'
  | 'author_en'
  | 'publisher'
  | 'publisher_en'
  | 'description'
  | 'description_en'
  | 'category'
  | 'category_en'
  | 'keywords'
  | 'keywords_en'
>;

/**
 * Normalizes Arabic and English text for search comparison using the exact
 * transformation pipeline from `js/render.js`:
 *
 * 1. `.toLocaleLowerCase(lang)`
 * 2. `.normalize('NFKD')` — decomposes `أ`, `إ`, `آ`, `ؤ`, `ئ` into base letters (`ا`, `و`, `ي`)
 *    plus combining maddah/hamza marks (`\u0653`–`\u0655`), and compatibility forms (e.g. `لا` ligatures).
 *    Note: `ة` (U+0629) and `ى` (U+0649) do not decompose under NFKD and remain distinct,
 *    preserving the exact behavior of the legacy search.
 * 3. Strips `[\u064B-\u065F\u0670]` (tashkeel, decomposed hamzas/maddah, superscript alef).
 * 4. Strips `\u0640` (tatweel / kashida).
 */
export function normalizeSearchText(value: string, lang: Language = 'ar'): string {
  return String(value ?? '')
    .toLocaleLowerCase(lang)
    .normalize('NFKD')
    .replace(ARABIC_DIACRITICS_REGEX, '')
    .replace(ARABIC_TATWEEL_REGEX, '');
}

export const norm = normalizeSearchText;

/**
 * Builds the searchable string haystack for a book from its bilingual metadata and keywords.
 * Equivalent to `haystack` construction in `filteredBooks()` (`js/render.js`).
 */
export function buildBookSearchHaystack(book: SearchableBook): string {
  return SEARCHABLE_BILINGUAL_FIELDS.flatMap((key) => [
    book[key],
    book[`${key}_en` as const]
  ])
    .concat(book.keywords, book.keywords_en)
    .join(' ');
}

/**
 * Checks whether a book matches a search query under the specified locale.
 * Empty queries match all books.
 */
export function matchesBookQuery(
  book: SearchableBook,
  query: string,
  lang: Language = 'ar'
): boolean {
  const normalizedQuery = normalizeSearchText(query, lang);
  if (!normalizedQuery) return true;
  const normalizedHaystack = normalizeSearchText(buildBookSearchHaystack(book), lang);
  return normalizedHaystack.includes(normalizedQuery);
}
