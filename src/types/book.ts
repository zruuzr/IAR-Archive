/* ============================================================
   IAR Archive — Book & Catalog Type Definitions
   Derived from books.json (173 records), validate_books.py,
   js/data.js, js/data-fetch.js, and js/render.js.
   ============================================================ */

export type Language = 'ar' | 'en';

export type AiStatus = 'complete' | 'partial';

export type SortOrder =
  'default' | 'title' | 'year' | 'pages' | 'downloads' | 'rating' | 'favorites';

export type BookLocalizedField =
  | 'title'
  | 'author'
  | 'category'
  | 'description'
  | 'publisher'
  | 'type'
  | 'target_audience'
  | 'badge_text';

export type BookStringMetricField = 'year' | 'pages' | 'file_size';

export type BookListField = 'keywords' | 'keywords_en' | 'key_points' | 'key_points_en';

/**
 * Raw book record as stored in `books.json` or produced by `process_books.py`.
 *
 * Notes on generation-1 vs generation-2 / partial records:
 * - `author` may be an empty string `""` for institutional references (books #84, #89, #95, #108, #121).
 * - `year` and `pages` are stored as numbers in `books.json` (e.g. `2026`, `140`, or `0` when unknown),
 *   and normalized to trimmed strings by `normalizeBook` to preserve the legacy UI contract.
 * - `file_type` (142/173), `featured` (59/173), `badge_text` / `badge_text_en` (35/173),
 *   `file_name` (34/173), and `ai_status` / `ai_attempts` (3/173) are omitted in older records.
 * - When `ai_status === "partial"`, only `id`, `title`, and `file_path` are guaranteed non-empty.
 */
export interface RawBookRecord {
  id: number | string;
  title: string;
  title_en?: string | null;
  author?: string | null;
  author_en?: string | null;
  category?: string | null;
  category_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  publisher?: string | null;
  publisher_en?: string | null;
  type?: string | null;
  type_en?: string | null;
  target_audience?: string | null;
  target_audience_en?: string | null;
  badge_text?: string | null;
  badge_text_en?: string | null;
  year?: number | string | null;
  pages?: number | string | null;
  file_size?: string | number | null;
  file_type?: string | null;
  isbn?: string | null;
  featured?: boolean | null;
  keywords?: readonly unknown[] | null;
  keywords_en?: readonly unknown[] | null;
  key_points?: readonly unknown[] | null;
  key_points_en?: readonly unknown[] | null;
  cover_image?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  source_sha256?: string | null;
  ai_status?: AiStatus | (string & {}) | null;
  ai_attempts?: number | null;
}

/**
 * Runtime metrics populated from Firebase Firestore (`downloads` and `ratings` collections).
 */
export interface BookMetrics {
  downloadCount: number;
  publicRating: number;
  ratingSum: number;
  ratingCount: number;
  voters: string[];
}

/**
 * Normalized book object produced by `normalizeBook` (matching `js/data.js` `normalize()`).
 *
 * Contract preservation:
 * - `year`, `pages`, and `file_size` are normalized as strings (`clean(raw[key])`).
 * - `cover_image` is resolved as a URL string (or `""` if empty/invalid).
 * - `file_path` is resolved against GitHub Raw when relative (or `""` if empty/invalid).
 * - `file_name` is sanitized and defaults to `IAR-${id}.pdf` when unavailable.
 */
export interface Book extends BookMetrics {
  id: number;
  title: string;
  title_en: string;
  author: string;
  author_en: string;
  category: string;
  category_en: string;
  description: string;
  description_en: string;
  publisher: string;
  publisher_en: string;
  type: string;
  type_en: string;
  target_audience: string;
  target_audience_en: string;
  badge_text: string;
  badge_text_en: string;
  year: string;
  pages: string;
  file_size: string;
  keywords: string[];
  keywords_en: string[];
  key_points: string[];
  key_points_en: string[];
  featured: boolean;
  cover_image: string;
  file_path: string;
  file_name: string;
}

export type NormalizedBook = Book;

export interface CategoryOption {
  key: string;
  label: string;
}

export interface CatalogFilterOptions {
  query?: string;
  category?: string;
  favoritesOnly?: boolean;
  favorites?: ReadonlySet<number> | readonly number[];
  bundleMode?: boolean;
  bundle?: ReadonlySet<number> | readonly number[];
  lang?: Language;
}

export interface CatalogSortOptions {
  lang?: Language;
  favorites?: ReadonlySet<number> | readonly number[];
}

export interface CatalogQueryOptions extends CatalogFilterOptions {
  sort?: SortOrder | (string & {});
  page?: number;
  pageSize?: number;
}

export type PaginationToken = number | 'ellipsis';

export interface PaginationResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageNumbers: number[];
  tokens: PaginationToken[];
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CatalogQueryResult {
  filteredBooks: Book[];
  gridBooks: Book[];
  pageBooks: Book[];
  featuredBook: Book | null;
  spotlightBook: Book | null;
  isDefaultView: boolean;
  currentPage: number;
  totalPages: number;
  totalFiltered: number;
  totalGrid: number;
  pageSize: number;
  pageNumbers: number[];
  tokens: PaginationToken[];
}
