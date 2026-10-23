import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  clean,
  findBookById,
  finite,
  formatCitation,
  GENERAL_CATEGORY_KEY,
  getBookField,
  getBookKeyPoints,
  getCategoryKey,
  getCategoryLabel,
  GITHUB_RAW_BASE_URL,
  loadCatalog,
  normalizeBook,
  normalizeCatalog,
  resolveAssetUrl,
  words
} from '@/services/catalog';
import type { Book, BookLocalizedField, RawBookRecord } from '@/types/book';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../');
const BOOKS_JSON_PATH = path.resolve(REPO_ROOT, 'books.json');

interface LegacyUtilsModule {
  clean: (v: unknown) => string;
  finite: (v: unknown) => number;
  words: (v: unknown) => string[];
}

interface LegacyDataModule {
  asset: (value: unknown, pdf?: boolean) => string;
  normalize: (raw: unknown) => Book | null;
  categoryKey: (book: Book) => string;
  categoryLabel: (book: Book) => string;
  points: (book: Book) => string[];
}

interface LegacyStateModule {
  state: {
    ui: { lang: 'ar' | 'en' };
    data: { books: Book[] };
  };
}

interface LegacyI18nModule {
  field: (book: Book, name: BookLocalizedField) => string;
}

describe('catalog service — pure helpers (clean, finite, words)', () => {
  it('clean() converts null/undefined to empty string and trims other values', () => {
    expect(clean(null)).toBe('');
    expect(clean(undefined)).toBe('');
    expect(clean('   مرحبا بالعالم   ')).toBe('مرحبا بالعالم');
    expect(clean(2026)).toBe('2026');
    expect(clean(0)).toBe('0');
    expect(clean(false)).toBe('false');
  });

  it('finite() coerces valid non-negative numbers and falls back to 0', () => {
    expect(finite(42)).toBe(42);
    expect(finite('15')).toBe(15);
    expect(finite(0)).toBe(0);
    expect(finite(-5)).toBe(0);
    expect(finite('NaN')).toBe(0);
    expect(finite(Number.POSITIVE_INFINITY)).toBe(0);
    expect(finite(undefined)).toBe(0);
  });

  it('words() normalizes arrays into trimmed non-empty strings', () => {
    expect(words(['  إدارة  ', '', '  ', null, undefined, 'تخطيط', 2026])).toEqual([
      'إدارة',
      'تخطيط',
      '2026'
    ]);
    expect(words(null)).toEqual([]);
    expect(words('not-an-array')).toEqual([]);
    expect(words({})).toEqual([]);
  });
});

describe('catalog service — resolveAssetUrl()', () => {
  const BASE_HREF = 'http://localhost:8000/index.html';

  it('resolves relative cover paths against baseHref / location.href', () => {
    expect(resolveAssetUrl('covers/1.png', false, BASE_HREF)).toBe(
      'http://localhost:8000/covers/1.png'
    );
    expect(resolveAssetUrl('/covers/42.png', false, BASE_HREF)).toBe(
      'http://localhost:8000/covers/42.png'
    );
  });

  it('resolves relative PDF paths against GitHub Raw main branch URL', () => {
    const resolved = resolveAssetUrl('pdf/sample_book.pdf', true, BASE_HREF);
    expect(resolved).toBe(`${GITHUB_RAW_BASE_URL}pdf/sample_book.pdf`);

    const resolvedLeadingSlash = resolveAssetUrl('/pdf/sample_book.pdf', true, BASE_HREF);
    expect(resolvedLeadingSlash).toBe(`${GITHUB_RAW_BASE_URL}pdf/sample_book.pdf`);
  });

  it('preserves valid external https/http URLs and rewrites GitHub blob URLs to raw.githubusercontent.com', () => {
    expect(
      resolveAssetUrl('https://example.org/assets/cover.png', false, BASE_HREF)
    ).toBe('https://example.org/assets/cover.png');

    expect(
      resolveAssetUrl(
        'https://github.com/zruuzr/IAR-Archive/blob/main/pdf/doc.pdf',
        true,
        BASE_HREF
      )
    ).toBe('https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/pdf/doc.pdf');
  });

  it('rejects non-http(s) protocols and URLs containing embedded credentials', () => {
    expect(resolveAssetUrl('javascript:alert(1)', false, BASE_HREF)).toBe('');
    expect(
      resolveAssetUrl('data:text/html,<script>alert(1)</script>', false, BASE_HREF)
    ).toBe('');
    expect(resolveAssetUrl('vbscript:msgbox("hi")', true, BASE_HREF)).toBe('');
    expect(resolveAssetUrl('mailto:admin@example.com', false, BASE_HREF)).toBe('');
    expect(resolveAssetUrl('ftp://files.example.com/book.pdf', true, BASE_HREF)).toBe('');
    expect(
      resolveAssetUrl('https://user:secret@example.com/private.pdf', true, BASE_HREF)
    ).toBe('');
    expect(
      resolveAssetUrl('https://user@example.com/private.pdf', false, BASE_HREF)
    ).toBe('');
  });

  it('returns empty string for empty, null, or undefined paths', () => {
    expect(resolveAssetUrl('', false, BASE_HREF)).toBe('');
    expect(resolveAssetUrl('   ', true, BASE_HREF)).toBe('');
    expect(resolveAssetUrl(null, false, BASE_HREF)).toBe('');
    expect(resolveAssetUrl(undefined, true, BASE_HREF)).toBe('');
  });
});

describe('catalog service — normalizeBook()', () => {
  const BASE_HREF = 'http://localhost:8000/';

  it('normalizes a complete valid record while preserving string year/pages contract', () => {
    const raw: RawBookRecord = {
      id: 1,
      title: '  دليل الطالب للقبول المركزي  ',
      title_en: '  Student Guide for Central Admission  ',
      author: 'وزارة التعليم العالي',
      author_en: 'Ministry of Higher Education',
      category: 'التعليم والقبول',
      category_en: 'Education & Admissions',
      type: 'دليل رسمي',
      type_en: 'Official Guide',
      description: 'وصف تفصيلي للمرجع.',
      description_en: 'Detailed reference description.',
      publisher: 'وزارة التعليم العالي',
      publisher_en: 'Ministry of Higher Education',
      target_audience: 'الطلبة الخريجون',
      target_audience_en: 'Graduating students',
      badge_text: 'إصدار محدث',
      badge_text_en: 'Updated Edition',
      year: 2026,
      pages: 140,
      file_size: ' 9.63 MB ',
      featured: true,
      keywords: [' القبول ', '', 'الجامعات'],
      keywords_en: ['Admission', 'Universities'],
      key_points: ['النقطة الأولى', 'النقطة الثانية'],
      key_points_en: ['First point', 'Second point'],
      cover_image: 'covers/1.png',
      file_path: 'pdf/student_guide.pdf',
      file_name: 'student_guide.pdf',
      isbn: '978-0000000000',
      file_type: 'PDF',
      source_sha256: 'a'.repeat(64),
      ai_status: 'complete',
      ai_attempts: 1
    };

    const book = normalizeBook(raw, { baseHref: BASE_HREF });
    expect(book).not.toBeNull();
    expect(book).toEqual({
      id: 1,
      title: 'دليل الطالب للقبول المركزي',
      title_en: 'Student Guide for Central Admission',
      author: 'وزارة التعليم العالي',
      author_en: 'Ministry of Higher Education',
      category: 'التعليم والقبول',
      category_en: 'Education & Admissions',
      type: 'دليل رسمي',
      type_en: 'Official Guide',
      description: 'وصف تفصيلي للمرجع.',
      description_en: 'Detailed reference description.',
      publisher: 'وزارة التعليم العالي',
      publisher_en: 'Ministry of Higher Education',
      target_audience: 'الطلبة الخريجون',
      target_audience_en: 'Graduating students',
      badge_text: 'إصدار محدث',
      badge_text_en: 'Updated Edition',
      year: '2026',
      pages: '140',
      file_size: '9.63 MB',
      keywords: ['القبول', 'الجامعات'],
      keywords_en: ['Admission', 'Universities'],
      key_points: ['النقطة الأولى', 'النقطة الثانية'],
      key_points_en: ['First point', 'Second point'],
      featured: true,
      cover_image: 'http://localhost:8000/covers/1.png',
      file_path: `${GITHUB_RAW_BASE_URL}pdf/student_guide.pdf`,
      file_name: 'student_guide.pdf',
      downloadCount: 0,
      publicRating: 0,
      ratingSum: 0,
      ratingCount: 0,
      voters: []
    });
  });

  it('handles partial and generation-1 records with missing optional fields', () => {
    const partialRaw: RawBookRecord = {
      id: '77',
      title: 'مرجع قيد المعالجة الآلية',
      file_path: 'pdf/%D9%85%D8%B1%D8%AC%D8%B9.pdf',
      ai_status: 'partial'
    };

    const book = normalizeBook(partialRaw, { baseHref: BASE_HREF });
    expect(book).not.toBeNull();
    expect(book?.id).toBe(77);
    expect(book?.author).toBe('');
    expect(book?.category).toBe('');
    expect(book?.year).toBe('');
    expect(book?.pages).toBe('');
    expect(book?.featured).toBe(false);
    expect(book?.cover_image).toBe('');
    expect(book?.file_name).toBe('مرجع.pdf');
    expect(book?.keywords).toEqual([]);
    expect(book?.key_points).toEqual([]);
  });

  it('derives fallback file_name IAR-${id}.pdf and sanitizes unsafe characters', () => {
    const withoutFileName = normalizeBook(
      { id: 12, title: 'كتاب بدون اسم ملف', file_path: '' },
      { baseHref: BASE_HREF }
    );
    expect(withoutFileName?.file_name).toBe('IAR-12.pdf');

    const withUnsafeChars = normalizeBook(
      {
        id: 13,
        title: 'كتاب مع محارف خاصة',
        file_name: 'folder/sub\\file\u0000name.pdf',
        file_path: 'pdf/doc.pdf'
      },
      { baseHref: BASE_HREF }
    );
    expect(withUnsafeChars?.file_name).toBe('folder_sub_file_name.pdf');
  });

  it('rejects invalid records (non-objects, invalid IDs, missing title)', () => {
    expect(normalizeBook(null)).toBeNull();
    expect(normalizeBook(undefined)).toBeNull();
    expect(normalizeBook('string')).toBeNull();
    expect(normalizeBook([])).toBeNull();
    expect(normalizeBook({ id: '', title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: '   ', title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: null, title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: true, title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: -1, title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: 1.5, title: 'عنوان' })).toBeNull();
    expect(normalizeBook({ id: 1, title: '   ' })).toBeNull();
  });
});

describe('catalog service — normalizeCatalog() & loadCatalog()', () => {
  it('throws when payload is not an array', () => {
    expect(() => normalizeCatalog(null)).toThrow('books.json must contain an array');
    expect(() => normalizeCatalog({ books: [] })).toThrow(
      'books.json must contain an array'
    );
  });

  it('filters invalid records and deduplicates books by id (keeping first occurrence)', () => {
    const payload = [
      { id: 1, title: 'النسخة الأولى', file_path: 'pdf/1.pdf' },
      { id: 1, title: 'النسخة المكررة', file_path: 'pdf/1-dup.pdf' },
      { id: -5, title: 'معرف سالب', file_path: 'pdf/bad.pdf' },
      { id: 2, title: '', file_path: 'pdf/empty-title.pdf' },
      { id: 3, title: 'المرجع الثالث', file_path: 'pdf/3.pdf' }
    ];

    const catalog = normalizeCatalog(payload, { baseHref: 'http://localhost:8000/' });
    expect(catalog).toHaveLength(2);
    expect(catalog.map((b) => b.id)).toEqual([1, 3]);
    expect(catalog[0].title).toBe('النسخة الأولى');
  });

  it('loadCatalog() fetches and normalizes books, and throws on HTTP or payload failure without mock fallback', async () => {
    const okFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 10, title: 'مرجع اختباري', file_path: 'pdf/10.pdf' }]
    });

    const books = await loadCatalog({
      url: '/books.json',
      fetchImpl: okFetch as unknown as typeof fetch,
      baseHref: 'http://localhost:8000/'
    });
    expect(books).toHaveLength(1);
    expect(books[0].id).toBe(10);
    expect(okFetch).toHaveBeenCalledOnce();

    const failedHttpFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => []
    });

    await expect(
      loadCatalog({
        url: '/books.json',
        fetchImpl: failedHttpFetch as unknown as typeof fetch
      })
    ).rejects.toThrow('books.json unavailable');

    const badPayloadFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'invalid' })
    });

    await expect(
      loadCatalog({
        url: '/books.json',
        fetchImpl: badPayloadFetch as unknown as typeof fetch
      })
    ).rejects.toThrow('books.json must contain an array');
  });
});

describe('catalog service — lookups, localized fields, categories, and APA citation', () => {
  const sampleBooks = normalizeCatalog(
    [
      {
        id: 5,
        title: 'الإدارة العامة الحديثة',
        title_en: 'Modern Public Administration',
        author: 'د. علي العراقي',
        author_en: 'Dr. Ali Al-Iraqi',
        category: 'الإدارة العامة',
        category_en: 'Public Administration',
        publisher: 'دار الحكمة',
        publisher_en: 'Al-Hikma Press',
        year: 2024,
        key_points: ['فكرة عربية ١'],
        key_points_en: ['English idea 1'],
        file_path: 'pdf/5.pdf'
      },
      {
        id: 6,
        title: 'تعليمات وزارية بدون مؤلف',
        author: '',
        category: '',
        publisher: '',
        year: '',
        key_points: [],
        key_points_en: [],
        file_path: 'pdf/6.pdf'
      }
    ],
    { baseHref: 'http://localhost:8000/' }
  );

  it('findBookById() locates books by numeric or string ID and handles invalid IDs safely', () => {
    expect(findBookById(sampleBooks, 5)?.title).toBe('الإدارة العامة الحديثة');
    expect(findBookById(sampleBooks, '6')?.id).toBe(6);
    expect(findBookById(sampleBooks, 999)).toBeUndefined();
    expect(findBookById(sampleBooks, '')).toBeUndefined();
    expect(findBookById(sampleBooks, '   ')).toBeUndefined();
    expect(findBookById(sampleBooks, null)).toBeUndefined();
    expect(findBookById(sampleBooks, undefined)).toBeUndefined();
  });

  it('getBookField(), getCategoryKey(), getCategoryLabel(), and getBookKeyPoints() respect language and fallbacks', () => {
    const [book5, book6] = sampleBooks;

    expect(getBookField(book5, 'title', 'ar')).toBe('الإدارة العامة الحديثة');
    expect(getBookField(book5, 'title', 'en')).toBe('Modern Public Administration');
    // Fallback to Arabic when English translation is empty
    expect(getBookField(book6, 'title', 'en')).toBe('تعليمات وزارية بدون مؤلف');

    expect(getCategoryKey(book5)).toBe('الإدارة العامة');
    expect(getCategoryKey(book6)).toBe(GENERAL_CATEGORY_KEY);

    expect(getCategoryLabel(book5, 'ar')).toBe('الإدارة العامة');
    expect(getCategoryLabel(book5, 'en')).toBe('Public Administration');
    expect(getCategoryLabel(book6, 'ar')).toBe('عام');
    expect(getCategoryLabel(book6, 'en')).toBe('General');

    expect(getBookKeyPoints(book5, 'ar')).toEqual(['فكرة عربية ١']);
    expect(getBookKeyPoints(book5, 'en')).toEqual(['English idea 1']);
    expect(getBookKeyPoints(book6, 'ar')).toEqual(['لم يُرفق ملخص لهذا المرجع بعد.']);
    expect(getBookKeyPoints(book6, 'en')).toEqual([
      'No summary has been provided for this reference yet.'
    ]);
  });

  it('formatCitation() formats APA citations in Arabic and English with fallbacks', () => {
    const [book5, book6] = sampleBooks;

    expect(formatCitation(book5, 'ar')).toBe(
      'د. علي العراقي (2024).\nالإدارة العامة الحديثة.\nدار الحكمة.'
    );
    expect(formatCitation(book5, 'en')).toBe(
      'Dr. Ali Al-Iraqi (2024).\nModern Public Administration.\nAl-Hikma Press.'
    );

    expect(formatCitation(book6, 'ar')).toBe(
      'غير متوفر (د.ت.).\nتعليمات وزارية بدون مؤلف.\nغير متوفر.'
    );
    expect(formatCitation(book6, 'en')).toBe(
      'Not provided (n.d.).\nتعليمات وزارية بدون مؤلف.\nNot provided.'
    );
  });
});

describe('integration & parity with real books.json and legacy Vanilla JS modules', () => {
  let rawCatalog: RawBookRecord[] = [];
  let legacyUtils: LegacyUtilsModule;
  let legacyData: LegacyDataModule;
  let legacyState: LegacyStateModule;
  let legacyI18n: LegacyI18nModule;

  beforeAll(async () => {
    const fileContent = fs.readFileSync(BOOKS_JSON_PATH, 'utf8');
    rawCatalog = JSON.parse(fileContent) as RawBookRecord[];

    // Minimal browser globals required for importing legacy js/state.js and js/data.js without side effects
    Object.defineProperty(globalThis, 'document', {
      value: {
        documentElement: { lang: 'ar', dataset: { theme: 'light' } }
      },
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis, 'location', {
      value: new URL('http://localhost:8000/'),
      configurable: true,
      writable: true
    });

    const utilsPath = '../../../js/utils.js';
    const dataPath = '../../../js/data.js';
    const statePath = '../../../js/state.js';
    const i18nPath = '../../../js/i18n.js';

    legacyUtils = (await import(utilsPath)) as LegacyUtilsModule;
    legacyData = (await import(dataPath)) as LegacyDataModule;
    legacyState = (await import(statePath)) as LegacyStateModule;
    legacyI18n = (await import(i18nPath)) as LegacyI18nModule;
  });

  it('loads and normalizes all real records from books.json without losing any ID', () => {
    expect(Array.isArray(rawCatalog)).toBe(true);
    expect(rawCatalog.length).toBeGreaterThanOrEqual(173);

    const normalized = normalizeCatalog(rawCatalog, {
      baseHref: 'http://localhost:8000/'
    });
    expect(normalized).toHaveLength(rawCatalog.length);

    const uniqueIds = new Set(normalized.map((b) => b.id));
    expect(uniqueIds.size).toBe(rawCatalog.length);

    for (const book of normalized) {
      expect(book.id).toBeGreaterThanOrEqual(1);
      expect(book.title.length).toBeGreaterThan(0);
      expect(book.file_path.startsWith(`${GITHUB_RAW_BASE_URL}pdf/`)).toBe(true);
      expect(book.cover_image.startsWith('http://localhost:8000/covers/')).toBe(true);
    }
  });

  it('produces 100% identical normalized Book objects to legacy js/data.js normalize() across all records', () => {
    for (const raw of rawCatalog) {
      const tsBook = normalizeBook(raw, { baseHref: 'http://localhost:8000/' });
      const jsBook = legacyData.normalize(raw);
      expect(tsBook).toEqual(jsBook);
    }
  });

  it('matches legacy categoryKey, categoryLabel, points, and field across all records in both Arabic and English', () => {
    const books = normalizeCatalog(rawCatalog, { baseHref: 'http://localhost:8000/' });

    for (const lang of ['ar', 'en'] as const) {
      legacyState.state.ui.lang = lang;
      for (const book of books) {
        expect(getCategoryKey(book)).toBe(legacyData.categoryKey(book));
        expect(getCategoryLabel(book, lang)).toBe(legacyData.categoryLabel(book));
        expect(getBookKeyPoints(book, lang)).toEqual(legacyData.points(book));
        expect(getBookField(book, 'title', lang)).toBe(legacyI18n.field(book, 'title'));
        expect(getBookField(book, 'author', lang)).toBe(legacyI18n.field(book, 'author'));
      }
    }

    // Verify pure utility parity as well
    for (const sample of [null, undefined, '  نص  ', 2026, 0, -5, 'abc']) {
      expect(clean(sample)).toBe(legacyUtils.clean(sample));
      expect(finite(sample)).toBe(legacyUtils.finite(sample));
    }
  });
});
