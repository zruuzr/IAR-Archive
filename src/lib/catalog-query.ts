/* ============================================================
   IAR Archive — Pure Catalog Filtering, Sorting, Pagination & Categories
   TypeScript port of filteredBooks(), pagination(), render() data pipeline,
   and categories() from js/render.js and js/router.js.
   ============================================================ */

import { buildBookSearchHaystack, normalizeSearchText } from '@/lib/arabic-search';
import {
  findBookById,
  getBookField,
  getCategoryKey,
  getCategoryLabel
} from '@/services/catalog';
import type {
  Book,
  CatalogFilterOptions,
  CatalogQueryOptions,
  CatalogQueryResult,
  CatalogSortOptions,
  CategoryOption,
  Language,
  PaginationResult,
  PaginationToken,
  SortOrder
} from '@/types/book';

export const DEFAULT_PAGE_SIZE = 6;
export const ALL_CATEGORIES_KEY = 'all';

function toIdSet(ids?: ReadonlySet<number> | readonly number[]): ReadonlySet<number> {
  if (!ids) return new Set<number>();
  if (ids instanceof Set) return ids;
  return new Set<number>(ids);
}

/**
 * Filters a list of books according to bundle mode, favorites filter, category key,
 * and search query.
 *
 * Equivalent to the `.filter(...)` stage in `filteredBooks()` (`js/render.js`).
 */
export function filterBooks(
  books: readonly Book[],
  options: CatalogFilterOptions = {}
): Book[] {
  const {
    query = '',
    category = ALL_CATEGORIES_KEY,
    favoritesOnly = false,
    favorites,
    bundleMode = false,
    bundle,
    lang = 'ar'
  } = options;

  const favoritesSet = toIdSet(favorites);
  const bundleSet = toIdSet(bundle);
  const normalizedQuery = normalizeSearchText(query, lang);

  return books.filter((book) => {
    if (bundleMode && !bundleSet.has(book.id)) return false;
    if (favoritesOnly && !favoritesSet.has(book.id)) return false;
    if (category !== ALL_CATEGORIES_KEY && getCategoryKey(book) !== category) {
      return false;
    }

    if (!normalizedQuery) return true;
    const haystack = buildBookSearchHaystack(book);
    return normalizeSearchText(haystack, lang).includes(normalizedQuery);
  });
}

/**
 * Sorts a list of books without mutating the original array, using the exact comparator
 * rules from `filteredBooks()` (`js/render.js`).
 */
export function sortBooks(
  books: readonly Book[],
  sortOrder: SortOrder | (string & {}) = 'default',
  options: CatalogSortOptions = {}
): Book[] {
  const { lang = 'ar', favorites } = options;
  const favoritesSet = toIdSet(favorites);

  const titleSort = (a: Book, b: Book): number =>
    getBookField(a, 'title', lang).localeCompare(getBookField(b, 'title', lang), lang);

  const comparators: Record<SortOrder, (a: Book, b: Book) => number> = {
    default: (a, b) => Number(b.featured) - Number(a.featured) || a.id - b.id,
    title: titleSort,
    year: (a, b) => Number(b.year || 0) - Number(a.year || 0),
    pages: (a, b) => Number(a.pages || 0) - Number(b.pages || 0),
    downloads: (a, b) => b.downloadCount - a.downloadCount,
    rating: (a, b) => b.publicRating - a.publicRating,
    favorites: (a, b) =>
      Number(favoritesSet.has(b.id)) - Number(favoritesSet.has(a.id)) || titleSort(a, b)
  };

  const comparator =
    (comparators as Record<string, ((a: Book, b: Book) => number) | undefined>)[
      sortOrder
    ] ?? comparators.default;

  return [...books].sort(comparator);
}

/**
 * Combined filter + sort step matching `filteredBooks()` in `js/render.js`.
 */
export function filterAndSortBooks(
  books: readonly Book[],
  options: CatalogQueryOptions = {}
): Book[] {
  const filtered = filterBooks(books, options);
  return sortBooks(filtered, options.sort ?? 'default', {
    lang: options.lang,
    favorites: options.favorites
  });
}

/**
 * Computes the visible page numbers for the pagination bar.
 * Equivalent to the `values` computation inside `pagination(total)` in `js/render.js`.
 */
export function getPaginationPageNumbers(
  currentPage: number,
  totalPages: number
): number[] {
  if (totalPages <= 1) return [];

  return [
    ...new Set([
      1,
      totalPages,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      ...(currentPage < 4 ? [2, 3, 4, 5] : []),
      ...(currentPage > totalPages - 3
        ? [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1]
        : [])
    ])
  ]
    .filter((v) => v > 0 && v <= totalPages)
    .sort((a, b) => a - b);
}

/**
 * Computes the pagination token sequence including `'ellipsis'` gaps when `value - last > 1`.
 * Equivalent to the loop inside `pagination(total)` in `js/render.js`.
 */
export function getPaginationTokens(
  currentPage: number,
  totalPages: number
): PaginationToken[] {
  const pageNumbers = getPaginationPageNumbers(currentPage, totalPages);
  const tokens: PaginationToken[] = [];
  let last = 0;

  for (const value of pageNumbers) {
    if (last && value - last > 1) {
      tokens.push('ellipsis');
    }
    tokens.push(value);
    last = value;
  }

  return tokens;
}

/**
 * Paginates an array of items, clamping `requestedPage` to `[1, Math.max(1, totalPages)]`
 * exactly as `render()` in `js/render.js` does.
 */
export function paginateItems<T>(
  items: readonly T[],
  requestedPage = 1,
  pageSize = DEFAULT_PAGE_SIZE
): PaginationResult<T> {
  const safeSize =
    Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : DEFAULT_PAGE_SIZE;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / safeSize);

  const normalizedRequested =
    Number.isFinite(requestedPage) && requestedPage >= 1 ? Math.trunc(requestedPage) : 1;
  const currentPage = Math.min(normalizedRequested, Math.max(1, totalPages));

  const start = (currentPage - 1) * safeSize;
  const pageItems = items.slice(start, start + safeSize);
  const pageNumbers = getPaginationPageNumbers(currentPage, totalPages);
  const tokens = getPaginationTokens(currentPage, totalPages);

  return {
    items: pageItems,
    currentPage,
    totalPages,
    totalItems,
    pageSize: safeSize,
    pageNumbers,
    tokens,
    hasPreviousPage: totalPages > 1 && currentPage > 1,
    hasNextPage: totalPages > 1 && currentPage < totalPages
  };
}

export const paginateBooks = paginateItems<Book>;

/**
 * Executes the complete catalog query pipeline from `render()` (`js/render.js`):
 * 1. Filters and sorts books.
 * 2. Determines `isDefaultView` (`!query && category === 'all' && !bundleMode && !favoritesOnly`).
 * 3. Selects `featuredBook` when in default view, removing it from `gridBooks`.
 * 4. Paginates `gridBooks` (clamping `page` to valid bounds).
 * 5. Sets `spotlightBook` to `featuredBook` only when `isDefaultView && currentPage === 1`.
 */
export function queryCatalog(
  books: readonly Book[],
  options: CatalogQueryOptions = {}
): CatalogQueryResult {
  const {
    query = '',
    category = ALL_CATEGORIES_KEY,
    favoritesOnly = false,
    bundleMode = false,
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE
  } = options;

  const filteredBooks = filterAndSortBooks(books, options);

  const isDefaultView =
    !query && category === ALL_CATEGORIES_KEY && !bundleMode && !favoritesOnly;

  const featuredBook = isDefaultView
    ? (filteredBooks.find((b) => b.featured) ?? null)
    : null;

  const gridBooks = featuredBook
    ? filteredBooks.filter((b) => b.id !== featuredBook.id)
    : filteredBooks;

  const pagination = paginateItems(gridBooks, page, pageSize);
  const spotlightBook =
    isDefaultView && pagination.currentPage === 1 ? featuredBook : null;

  return {
    filteredBooks,
    gridBooks,
    pageBooks: pagination.items,
    featuredBook,
    spotlightBook,
    isDefaultView,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalFiltered: filteredBooks.length,
    totalGrid: gridBooks.length,
    pageSize: pagination.pageSize,
    pageNumbers: pagination.pageNumbers,
    tokens: pagination.tokens
  };
}

/**
 * Extracts unique categories in first-seen key order while updating the label to the last
 * seen book for that key — matching `categories()` in `js/render.js`.
 *
 * Does not merge or rename the 114 categories in `books.json`.
 */
export function extractCategories(
  books: readonly Book[],
  lang: Language = 'ar'
): CategoryOption[] {
  const map = new Map<string, string>();
  for (const book of books) {
    map.set(getCategoryKey(book), getCategoryLabel(book, lang));
  }
  return Array.from(map, ([key, label]) => ({ key, label }));
}

/**
 * Returns the full list of category filter chips including the leading `'all'` option.
 * Equivalent to `[['all', t('كل المراجع', 'All references')], ...map]` in `js/render.js`.
 */
export function getCategoryChips(
  books: readonly Book[],
  lang: Language = 'ar'
): CategoryOption[] {
  const allOption: CategoryOption = {
    key: ALL_CATEGORIES_KEY,
    label: lang === 'ar' ? 'كل المراجع' : 'All references'
  };
  return [allOption, ...extractCategories(books, lang)];
}

/**
 * Parses a comma-separated `bundle` URL query parameter into a validated Set of book IDs
 * that exist in `books`.
 * Equivalent to bundle parameter parsing in `route()` (`js/router.js`).
 */
export function parseBundleParam(
  bundleParam: string | null | undefined,
  books: readonly Book[]
): Set<number> {
  if (bundleParam === null || bundleParam === undefined) {
    return new Set<number>();
  }

  return new Set<number>(
    bundleParam
      .split(',')
      .filter((v) => v.trim() !== '')
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && Boolean(findBookById(books, id)))
  );
}
