import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildBookSearchHaystack,
  matchesBookQuery,
  normalizeSearchText
} from '@/lib/arabic-search';
import {
  ALL_CATEGORIES_KEY,
  DEFAULT_PAGE_SIZE,
  extractCategories,
  filterAndSortBooks,
  filterBooks,
  getCategoryChips,
  getPaginationPageNumbers,
  getPaginationTokens,
  paginateBooks,
  parseBundleParam,
  queryCatalog,
  sortBooks
} from '@/lib/catalog-query';
import { normalizeBook, normalizeCatalog } from '@/services/catalog';
import type { Book, RawBookRecord } from '@/types/book';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_JSON_PATH = path.resolve(__dirname, '../../../books.json');

function makeBook(
  overrides: Partial<RawBookRecord> & { id: number; title: string }
): Book {
  const normalized = normalizeBook(
    {
      file_path: `pdf/${overrides.id}.pdf`,
      cover_image: `covers/${overrides.id}.png`,
      ...overrides
    },
    { baseHref: 'http://localhost:8000/' }
  );
  if (!normalized) {
    throw new Error(`Failed to create test book #${overrides.id}`);
  }
  return normalized;
}

describe('arabic-search — normalizeSearchText() & matchesBookQuery()', () => {
  it('strips tashkeel, superscript alef, and tatweel while unifying hamza variants via NFKD', () => {
    expect(normalizeSearchText('الإِدَارَةُ العَامَّةُ')).toBe('الادارة العامة');
    expect(normalizeSearchText('العـراقـــي')).toBe('العراقي');
    expect(normalizeSearchText('أحمد وإبراهيم وآدم')).toBe('احمد وابراهيم وادم');
    expect(normalizeSearchText('مسؤول وهيئة')).toBe('مسوول وهيية');
  });

  it('preserves Taa Marbuta (ة vs ه) and Alef Maksura (ى vs ي) per legacy NFKD behavior', () => {
    expect(normalizeSearchText('إدارة')).toBe('ادارة');
    expect(normalizeSearchText('اداره')).toBe('اداره');
    expect(normalizeSearchText('إدارة')).not.toBe(normalizeSearchText('اداره'));

    expect(normalizeSearchText('مستشفى')).toBe('مستشفى');
    expect(normalizeSearchText('مستشفي')).toBe('مستشفي');
    expect(normalizeSearchText('مستشفى')).not.toBe(normalizeSearchText('مستشفي'));
  });

  it('matches Arabic and English queries across title, author, publisher, description, category, and keywords', () => {
    const book = makeBook({
      id: 1,
      title: 'إدارة الموارد البشرية في القطاع العام',
      title_en: 'Human Resource Management in the Public Sector',
      author: 'د. قحطان العبيدي',
      author_en: 'Dr. Qahtan Al-Obaidi',
      publisher: 'المعهد العالي للتطوير الإداري',
      publisher_en: 'Higher Institute of Administrative Development',
      description: 'دراسة تطبيقية حول التخطيط الوظيفي والقيادة.',
      description_en: 'Applied study on career planning and leadership.',
      category: 'الموارد البشرية',
      category_en: 'Human Resources',
      keywords: ['التوظيف', 'الحوكمة'],
      keywords_en: ['Recruitment', 'Governance'],
      target_audience: 'مديرو الدوائر غير المفهرسة في البحث'
    });

    expect(buildBookSearchHaystack(book)).toContain('Human Resource Management');
    // Arabic query without hamza matches title with hamza below (إدارة)
    expect(matchesBookQuery(book, 'ادارة الموارد', 'ar')).toBe(true);
    // Query with tashkeel and tatweel matches clean book text
    expect(matchesBookQuery(book, 'القِطَاع العَـــام', 'ar')).toBe(true);
    // English case-insensitive query matches description_en and keywords_en
    expect(matchesBookQuery(book, 'LEADERSHIP', 'en')).toBe(true);
    expect(matchesBookQuery(book, 'governance', 'en')).toBe(true);
    // Non-indexed field (target_audience) is not part of the legacy search haystack
    expect(matchesBookQuery(book, 'غير المفهرسة', 'ar')).toBe(false);
    // Empty query always matches
    expect(matchesBookQuery(book, '', 'ar')).toBe(true);
  });
});

describe('catalog-query — filterBooks() and sortBooks()', () => {
  const b1 = makeBook({
    id: 1,
    title: 'ب — التخطيط الاستراتيجي',
    title_en: 'B — Strategic Planning',
    category: 'التخطيط',
    category_en: 'Planning',
    year: 2021,
    pages: 300,
    featured: false
  });
  b1.downloadCount = 15;
  b1.publicRating = 4.2;

  const b2 = makeBook({
    id: 2,
    title: 'أ — الحوكمة المؤسسية',
    title_en: 'A — Corporate Governance',
    category: 'الحوكمة',
    category_en: 'Governance',
    year: 2025,
    pages: 120,
    featured: true
  });
  b2.downloadCount = 80;
  b2.publicRating = 4.9;

  const b3 = makeBook({
    id: 3,
    title: 'ج — القيادة الإدارية',
    title_en: 'C — Administrative Leadership',
    category: '',
    category_en: '',
    year: 2023,
    pages: 210,
    featured: false
  });
  b3.downloadCount = 40;
  b3.publicRating = 3.8;

  const catalog = [b1, b2, b3];

  it('filters by category, favoritesOnly, bundleMode, and search query', () => {
    expect(filterBooks(catalog, { category: 'التخطيط' }).map((b) => b.id)).toEqual([1]);
    expect(filterBooks(catalog, { category: '__general__' }).map((b) => b.id)).toEqual([
      3
    ]);

    expect(
      filterBooks(catalog, {
        favoritesOnly: true,
        favorites: new Set([1, 3])
      }).map((b) => b.id)
    ).toEqual([1, 3]);

    expect(
      filterBooks(catalog, {
        bundleMode: true,
        bundle: [2]
      }).map((b) => b.id)
    ).toEqual([2]);

    // When bundleMode is active with an empty bundle, no books match
    expect(
      filterBooks(catalog, {
        bundleMode: true,
        bundle: []
      })
    ).toEqual([]);

    // No matches for unknown query
    expect(filterBooks(catalog, { query: 'مصطلح غير موجود إطلاقاً' })).toEqual([]);
  });

  it('sorts books accurately across all 7 supported sort modes without mutating input', () => {
    const snapshot = [...catalog];

    // default: featured first, then ascending id
    expect(sortBooks(catalog, 'default').map((b) => b.id)).toEqual([2, 1, 3]);

    // title (Arabic & English)
    expect(sortBooks(catalog, 'title', { lang: 'ar' }).map((b) => b.id)).toEqual([
      2, 1, 3
    ]);
    expect(sortBooks(catalog, 'title', { lang: 'en' }).map((b) => b.id)).toEqual([
      2, 1, 3
    ]);

    // year: newest first (2025, 2023, 2021)
    expect(sortBooks(catalog, 'year').map((b) => b.id)).toEqual([2, 3, 1]);

    // pages: fewest pages first (120, 210, 300)
    expect(sortBooks(catalog, 'pages').map((b) => b.id)).toEqual([2, 3, 1]);

    // downloads: highest first (80, 40, 15)
    expect(sortBooks(catalog, 'downloads').map((b) => b.id)).toEqual([2, 3, 1]);

    // rating: highest first (4.9, 4.2, 3.8)
    expect(sortBooks(catalog, 'rating').map((b) => b.id)).toEqual([2, 1, 3]);

    // favorites: favorites first, then localized title sort
    expect(
      sortBooks(catalog, 'favorites', {
        lang: 'en',
        favorites: new Set([3, 1])
      }).map((b) => b.id)
    ).toEqual([1, 3, 2]);

    // unknown sort falls back to default
    expect(sortBooks(catalog, 'unknown_sort').map((b) => b.id)).toEqual([2, 1, 3]);

    // input array was not mutated
    expect(catalog).toEqual(snapshot);
  });

  it('filterAndSortBooks() combines filtering and sorting in a single pipeline', () => {
    const result = filterAndSortBooks(catalog, {
      favoritesOnly: true,
      favorites: [1, 3],
      sort: 'year'
    });
    expect(result.map((b) => b.id)).toEqual([3, 1]);
  });
});

describe('catalog-query — pagination, ellipsis tokens, and queryCatalog()', () => {
  const twentyBooks = Array.from({ length: 20 }, (_, i) =>
    makeBook({
      id: i + 1,
      title: `مرجع رقم ${i + 1}`,
      featured: i === 0 // Book #1 is featured
    })
  );

  it('paginates items, clamps out-of-range pages, and handles empty lists', () => {
    const page1 = paginateBooks(twentyBooks, 1, DEFAULT_PAGE_SIZE);
    expect(page1.currentPage).toBe(1);
    expect(page1.totalPages).toBe(4);
    expect(page1.items.map((b) => b.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(page1.hasPreviousPage).toBe(false);
    expect(page1.hasNextPage).toBe(true);

    const lastPage = paginateBooks(twentyBooks, 99, DEFAULT_PAGE_SIZE);
    expect(lastPage.currentPage).toBe(4);
    expect(lastPage.items.map((b) => b.id)).toEqual([19, 20]);
    expect(lastPage.hasPreviousPage).toBe(true);
    expect(lastPage.hasNextPage).toBe(false);

    const negativePage = paginateBooks(twentyBooks, -3, DEFAULT_PAGE_SIZE);
    expect(negativePage.currentPage).toBe(1);

    const emptyResult = paginateBooks([], 3, DEFAULT_PAGE_SIZE);
    expect(emptyResult.currentPage).toBe(1);
    expect(emptyResult.totalPages).toBe(0);
    expect(emptyResult.items).toEqual([]);
    expect(emptyResult.pageNumbers).toEqual([]);
    expect(emptyResult.tokens).toEqual([]);
    expect(emptyResult.hasPreviousPage).toBe(false);
    expect(emptyResult.hasNextPage).toBe(false);
  });

  it('computes pagination window numbers and ellipsis tokens identically to js/render.js', () => {
    expect(getPaginationPageNumbers(1, 1)).toEqual([]);
    expect(getPaginationPageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5, 10]);
    expect(getPaginationTokens(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10]);

    expect(getPaginationPageNumbers(5, 10)).toEqual([1, 4, 5, 6, 10]);
    expect(getPaginationTokens(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);

    expect(getPaginationPageNumbers(9, 10)).toEqual([1, 6, 7, 8, 9, 10]);
    expect(getPaginationTokens(9, 10)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10]);
  });

  it('queryCatalog() separates featured spotlight book in default view and keeps it in grid when filtered', () => {
    const defaultPage1 = queryCatalog(twentyBooks, { page: 1 });
    expect(defaultPage1.isDefaultView).toBe(true);
    expect(defaultPage1.featuredBook?.id).toBe(1);
    expect(defaultPage1.spotlightBook?.id).toBe(1);
    expect(defaultPage1.totalGrid).toBe(19);
    // Book #1 is in spotlight, so grid page 1 starts at Book #2
    expect(defaultPage1.pageBooks.map((b) => b.id)).toEqual([2, 3, 4, 5, 6, 7]);

    const defaultPage2 = queryCatalog(twentyBooks, { page: 2 });
    expect(defaultPage2.isDefaultView).toBe(true);
    expect(defaultPage2.featuredBook?.id).toBe(1);
    // Spotlight is hidden on page 2, but Book #1 stays excluded from gridBooks
    expect(defaultPage2.spotlightBook).toBeNull();
    expect(defaultPage2.pageBooks.map((b) => b.id)).toEqual([8, 9, 10, 11, 12, 13]);

    const filteredView = queryCatalog(twentyBooks, { query: 'مرجع', page: 1 });
    expect(filteredView.isDefaultView).toBe(false);
    expect(filteredView.featuredBook).toBeNull();
    expect(filteredView.spotlightBook).toBeNull();
    expect(filteredView.totalGrid).toBe(20);
    expect(filteredView.pageBooks.map((b) => b.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('catalog-query — real books.json categories (110 categories) and bundle parameter parsing', () => {
  const rawCatalog = JSON.parse(
    fs.readFileSync(BOOKS_JSON_PATH, 'utf8')
  ) as RawBookRecord[];
  const realBooks = normalizeCatalog(rawCatalog, { baseHref: 'http://localhost:8000/' });

  it('extracts all 110 unique categories from books.json without merging or renaming', () => {
    const categoriesAr = extractCategories(realBooks, 'ar');
    const categoriesEn = extractCategories(realBooks, 'en');

    expect(categoriesAr).toHaveLength(110);
    expect(categoriesEn).toHaveLength(110);
    expect(categoriesAr[0]).toEqual({
      key: 'التعليم والقبول',
      label: 'التعليم والقبول'
    });
    expect(categoriesEn[0]).toEqual({
      key: 'التعليم والقبول',
      label: 'Education & Admissions'
    });

    const chipsAr = getCategoryChips(realBooks, 'ar');
    const chipsEn = getCategoryChips(realBooks, 'en');
    expect(chipsAr).toHaveLength(111);
    expect(chipsAr[0]).toEqual({ key: ALL_CATEGORIES_KEY, label: 'كل المراجع' });
    expect(chipsEn[0]).toEqual({ key: ALL_CATEGORIES_KEY, label: 'All references' });
  });

  it('parseBundleParam() extracts only valid existing book IDs from comma-separated strings', () => {
    expect([...parseBundleParam('1, 2, 999999, abc, -4, , 5', realBooks)]).toEqual([
      1, 2, 5
    ]);
    expect([...parseBundleParam(null, realBooks)]).toEqual([]);
    expect([...parseBundleParam('', realBooks)]).toEqual([]);
  });
});
