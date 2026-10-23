// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { normalizeCatalog } from '@/services/catalog';
import type { Book } from '@/types/book';

const SAMPLE_BOOKS: Book[] = normalizeCatalog([
  {
    id: 1,
    title: 'الإدارة العامة الحديثة في العراق',
    title_en: 'Modern Public Administration in Iraq',
    author: 'د. علي الكاظمي',
    author_en: 'Dr. Ali Al-Kadhimi',
    category: 'الإدارة العامة',
    category_en: 'Public Administration',
    description: 'مرجع شامل في الحوكمة والإصلاح المؤسسي.',
    description_en: 'Comprehensive reference on governance and institutional reform.',
    publisher: 'دار الحكمة ببغداد',
    publisher_en: 'Bayt al-Hikma Press',
    type: 'كتاب منهجي',
    type_en: 'Textbook',
    target_audience: 'الباحثون وطلبة الدراسات العليا',
    target_audience_en: 'Researchers and graduate students',
    badge_text: 'إصدار مختار',
    badge_text_en: 'Featured Edition',
    year: '2025',
    pages: '320',
    file_size: '4.2 MB',
    keywords: ['حوكمة', 'إدارة'],
    keywords_en: ['governance', 'administration'],
    key_points: ['تحليل الهياكل التنظيمية', 'تطوير الأداء المؤسسي'],
    key_points_en: ['Organizational structure analysis', 'Institutional performance'],
    featured: true,
    cover_image: 'https://example.com/covers/1.jpg',
    file_path: 'pdf/1.pdf',
    file_name: '1.pdf'
  },
  {
    id: 2,
    title: 'التخطيط الاستراتيجي المؤسسي',
    title_en: 'Institutional Strategic Planning',
    author: 'د. سارة العبيدي',
    author_en: 'Dr. Sara Al-Obaidi',
    category: 'التخطيط الاستراتيجي',
    category_en: 'Strategic Planning',
    description: 'دليل تطبيقي لبناء الخطط الاستراتيجية ومؤشرات الأداء.',
    description_en: 'Practical guide to building strategic plans and KPIs.',
    publisher: 'المركز الوطني للتطوير الإداري',
    publisher_en: 'National Center for Management Development',
    target_audience: 'مديرو التخطيط والسياسات',
    target_audience_en: 'Planning and policy directors',
    key_points: ['صياغة الرؤية والرسالة', 'قياس مؤشرات الأداء الرئيسية'],
    key_points_en: [
      'Formulating vision and mission',
      'Measuring key performance indicators'
    ],
    year: '2026',
    pages: '210',
    featured: false,
    cover_image: '',
    file_path: 'pdf/2.pdf',
    file_name: '2.pdf'
  },
  {
    id: 3,
    title: 'القيادة الإدارية وإدارة التغيير',
    title_en: 'Administrative Leadership and Change Management',
    author: 'د. حسن الربيعي',
    author_en: 'Dr. Hassan Al-Rubaie',
    category: 'القيادة الإدارية',
    category_en: 'Administrative Leadership',
    description: 'دراسة في نظريات القيادة التحويلية.',
    description_en: 'Study in transformational leadership theories.',
    publisher: 'مطبعة الجامعة',
    publisher_en: 'University Press',
    year: '2024',
    pages: '180',
    featured: false,
    cover_image: 'https://example.com/covers/broken.jpg',
    file_path: 'pdf/3.pdf',
    file_name: '3.pdf'
  },
  ...Array.from({ length: 7 }, (_, i) => ({
    id: i + 4,
    title: `مرجع إداري تخصصي رقم ${i + 4}`,
    title_en: `Specialized Administrative Reference ${i + 4}`,
    author: `مؤلف ${i + 4}`,
    author_en: `Author ${i + 4}`,
    category: i % 2 === 0 ? 'الإدارة العامة' : `مسار تخصصي ${i + 4}`,
    category_en: i % 2 === 0 ? 'Public Administration' : `Specialized Path ${i + 4}`,
    description: `وصف تفصيلي للمرجع رقم ${i + 4}.`,
    description_en: `Detailed description for reference ${i + 4}.`,
    year: String(2018 + i),
    pages: String(120 + i * 15),
    featured: false,
    cover_image: '',
    file_path: `pdf/${i + 4}.pdf`
  }))
]);

describe('Phase 2.3A & 2.3B — Library UI, Reference Experience & Interactive Modals', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/migration.html');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, hero with real catalog stats, featured spotlight (without grid duplication), and paginated cards', () => {
    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Header & Hero real counters (10 books, 6 distinct categories, 2026 archive year)
    expect(screen.getByTestId('site-header')).toBeTruthy();
    expect(screen.getByTestId('hero-academic')).toBeTruthy();
    expect(screen.getByTestId('stat-total-books').textContent).toBe('10');
    expect(screen.getByTestId('stat-total-categories').textContent).toBe('6');
    expect(screen.getByTestId('stat-archive-year').textContent).toBe('2026');

    // Featured book #1 is shown in FeaturedSpotlight and NOT duplicated in BookGrid
    expect(screen.getByTestId('featured-spotlight')).toBeTruthy();
    expect(screen.getByTestId('spotlight-card-1')).toBeTruthy();
    expect(screen.queryByTestId('book-card-1')).toBeNull();

    // Page 1 shows 6 grid cards (books 2..7)
    expect(screen.getByTestId('book-card-2')).toBeTruthy();
    expect(screen.getByTestId('book-card-7')).toBeTruthy();
    expect(screen.queryByTestId('book-card-8')).toBeNull();

    // Pagination shows 2 pages (9 non-spotlight books / 6 per page = 2 pages)
    expect(screen.getByTestId('pagination-nav')).toBeTruthy();
    fireEvent.click(screen.getByTestId('pagination-page-2'));

    // On Page 2, FeaturedSpotlight is hidden and remaining books 8..10 are displayed
    expect(screen.queryByTestId('featured-spotlight')).toBeNull();
    expect(screen.getByTestId('book-card-8')).toBeTruthy();
    expect(screen.getByTestId('book-card-10')).toBeTruthy();
  });

  it('falls back to a designed editorial cover when cover_image is empty or fails to load', () => {
    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Book 2 has empty cover_image -> renders designed fallback immediately
    expect(screen.getByTestId('book-cover-fallback-2')).toBeTruthy();

    // Book 3 has cover_image -> renders <img> initially, then switches to fallback on error
    const img3 = screen.getByTestId('book-cover-img-3');
    expect(img3).toBeTruthy();
    fireEvent.error(img3);
    expect(screen.getByTestId('book-cover-fallback-3')).toBeTruthy();
  });

  it('supports instant search, category pathways + searchable all-categories directory, sorting, and view mode toggle', () => {
    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Open searchable all-categories directory
    const openDirectoryBtn = screen.getByTestId('open-all-categories-btn');
    fireEvent.click(openDirectoryBtn);
    expect(screen.getByTestId('all-categories-panel')).toBeTruthy();

    // Search inside categories directory
    const catSearch = screen.getByTestId('category-search-input');
    fireEvent.change(catSearch, { target: { value: 'التخطيط' } });
    const strategicCatBtn = screen.getByTestId('directory-category-التخطيط الاستراتيجي');
    fireEvent.click(strategicCatBtn);

    // Directory closes and filters to Strategic Planning (only Book #2)
    expect(screen.queryByTestId('all-categories-panel')).toBeNull();
    expect(screen.getByTestId('book-card-2')).toBeTruthy();
    expect(screen.queryByTestId('book-card-3')).toBeNull();

    // Reset filters back to all
    fireEvent.click(screen.getByTestId('controls-reset-filters'));
    expect(screen.getByTestId('book-card-3')).toBeTruthy();

    // Search via main search input
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'القيادة الإدارية' } });
    expect(screen.getByTestId('book-card-3')).toBeTruthy();
    expect(screen.queryByTestId('book-card-2')).toBeNull();

    // Clear search
    fireEvent.click(screen.getByTestId('clear-search-btn'));
    expect(screen.getByTestId('book-card-2')).toBeTruthy();

    // Switch view mode between Grid, List, and Workbench
    const listBtn = screen.getByTestId('view-list-btn');
    fireEvent.click(listBtn);
    expect(screen.getByTestId('books-grid').getAttribute('data-view-mode')).toBe('list');

    const workbenchBtn = screen.getByTestId('view-workbench-btn');
    fireEvent.click(workbenchBtn);
    expect(screen.getByTestId('books-grid').getAttribute('data-view-mode')).toBe(
      'workbench'
    );
    expect(screen.getByTestId('workbench-inspector')).toBeTruthy();
  });

  it('wires favorites, research bundle bar, APA citation copy, PDF reader dialog, and single book details view', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    });

    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Toggle favorite on Book 2
    fireEvent.click(screen.getByTestId('book-favorite-btn-2'));
    expect(screen.getByTestId('header-favorites-count').textContent).toBe('1');

    // Filter by favorites only
    fireEvent.click(screen.getByTestId('header-favorites-btn'));
    expect(screen.getByTestId('book-card-2')).toBeTruthy();
    expect(screen.queryByTestId('book-card-3')).toBeNull();

    // Disable favorites filter
    fireEvent.click(screen.getByTestId('header-favorites-btn'));

    // Add Book 2 and Book 3 to Research Bundle
    fireEvent.click(screen.getByTestId('book-bundle-btn-2'));
    fireEvent.click(screen.getByTestId('book-bundle-btn-3'));
    expect(screen.getByTestId('bundle-bar')).toBeTruthy();
    expect(screen.getByTestId('bundle-count').textContent).toBe('2');

    // Copy APA citation on Book 2
    await act(async () => {
      fireEvent.click(screen.getByTestId('book-cite-btn-2'));
    });
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('التخطيط الاستراتيجي المؤسسي')
    );

    // Open PDF Reader Dialog on Book 2
    fireEvent.click(screen.getByTestId('book-read-btn-2'));
    expect(screen.getByTestId('pdf-reader-dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('pdf-reader-close'));
    expect(screen.queryByTestId('pdf-reader-dialog')).toBeNull();

    // Open Single Book Details View for Book 2 and return to list
    fireEvent.click(screen.getByTestId('book-title-link-2'));
    expect(screen.getByTestId('book-details-view')).toBeTruthy();
    expect(screen.getByTestId('single-book-title').textContent).toBe(
      'التخطيط الاستراتيجي المؤسسي'
    );
    fireEvent.click(screen.getByTestId('back-to-library-btn'));
    expect(screen.queryByTestId('book-details-view')).toBeNull();
    expect(screen.getByTestId('book-card-2')).toBeTruthy();
  });

  it('opens 3-Minute Summary Dialog with key points, audience, copy summary/APA, and navigates to full reference page', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock }
    });

    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Clicking "ملخص 3 دقائق" on Book 2 opens SummaryDialog (distinct from BookDetailsView)
    fireEvent.click(screen.getByTestId('book-summary-btn-2'));
    expect(screen.getByTestId('summary-dialog')).toBeTruthy();
    expect(screen.queryByTestId('book-details-view')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    expect(screen.getByTestId('summary-dialog-title').textContent).toBe(
      'التخطيط الاستراتيجي المؤسسي'
    );
    expect(screen.getByTestId('summary-dialog-description').textContent).toContain(
      'دليل تطبيقي لبناء الخطط الاستراتيجية'
    );
    expect(screen.getByTestId('summary-dialog-keypoints').textContent).toContain(
      'صياغة الرؤية والرسالة'
    );
    expect(screen.getByTestId('summary-dialog-audience').textContent).toBe(
      'مديرو التخطيط والسياسات'
    );

    // Copy summary text
    await act(async () => {
      fireEvent.click(screen.getByTestId('summary-copy-summary-btn'));
    });
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('صياغة الرؤية والرسالة')
    );

    // Copy APA citation from summary modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('summary-copy-apa-btn'));
    });
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('المركز الوطني للتطوير الإداري')
    );

    // Navigate from SummaryDialog to full BookDetailsView
    fireEvent.click(screen.getByTestId('summary-open-details-btn'));
    expect(screen.queryByTestId('summary-dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(screen.getByTestId('book-details-view')).toBeTruthy();
    expect(screen.getByTestId('single-book-title').textContent).toBe(
      'التخطيط الاستراتيجي المؤسسي'
    );
  });

  it('opens CoverZoomDialog when clicking a cover, supports Escape close, focus restoration, and fallback on broken images', () => {
    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    const coverTrigger1 = screen.getByTestId('book-cover-btn-1');
    coverTrigger1.focus();
    fireEvent.click(coverTrigger1);

    expect(screen.getByTestId('cover-zoom-dialog')).toBeTruthy();
    expect(screen.getByTestId('cover-zoom-img')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');

    // Close via Escape key and verify scroll unlock + focus return
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('cover-zoom-dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(coverTrigger1);

    // Clicking cover of Book 2 (empty cover_image) shows designed fallback inside CoverZoomDialog
    fireEvent.click(screen.getByTestId('book-cover-btn-2'));
    expect(screen.getByTestId('cover-zoom-dialog')).toBeTruthy();
    expect(screen.getByTestId('cover-zoom-fallback')).toBeTruthy();
    fireEvent.click(screen.getByTestId('cover-zoom-close-btn'));
    expect(screen.queryByTestId('cover-zoom-dialog')).toBeNull();
  });

  it('supports interactive 1-5 star rating and prevents duplicate votes in the same session', async () => {
    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    // Initially Book 2 has 0 ratings ("كن أول المقيّمين")
    expect(screen.getByTestId('rating-summary-2').textContent).toContain(
      'كن أول المقيّمين'
    );

    // Rate Book 2 with 5 stars
    await act(async () => {
      fireEvent.click(screen.getByTestId('rate-star-2-5'));
    });

    // Rating summary updates to 5.00 · 1
    expect(screen.getByTestId('rating-summary-2').textContent).toBe('5.00 · 1');

    // Attempting to rate Book 2 again in the same session shows alreadyRated notice and does not increment count
    await act(async () => {
      fireEvent.click(screen.getByTestId('rate-star-2-3'));
    });
    expect(screen.getByTestId('rating-summary-2').textContent).toBe('5.00 · 1');
  });

  it('renders BookNotFoundView for invalid or non-existent ?book= URL parameters and recovers to the library', () => {
    window.history.replaceState({}, '', '/migration.html?book=99999');

    render(
      <App
        initialLang="ar"
        syncUrl={true}
        catalogOptions={{
          initialBooks: SAMPLE_BOOKS,
          autoLoad: false,
          autoLoadMetrics: false
        }}
      />
    );

    expect(screen.getByTestId('book-not-found-view')).toBeTruthy();
    expect(screen.getByTestId('book-not-found-title').textContent).toContain(
      'المرجع غير موجود'
    );

    // Clicking "العودة إلى المكتبة" cleans ?book from the URL and shows the library grid
    fireEvent.click(screen.getByTestId('not-found-back-btn'));
    expect(screen.queryByTestId('book-not-found-view')).toBeNull();
    expect(window.location.search).toBe('');
    expect(screen.getByTestId('book-card-2')).toBeTruthy();
  });

  it('displays catalog error state and recovers when Retry is clicked', async () => {
    let shouldFail = true;
    const customFetch = vi.fn().mockImplementation(async () => {
      if (shouldFail) {
        return new Response(null, { status: 500 });
      }
      return new Response(JSON.stringify(SAMPLE_BOOKS), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    render(
      <App
        initialLang="ar"
        syncUrl={false}
        catalogOptions={{
          autoLoad: true,
          autoLoadMetrics: false,
          fetchImpl: customFetch as unknown as typeof fetch
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('catalog-error-state')).toBeTruthy();
    });

    shouldFail = false;
    fireEvent.click(screen.getByTestId('catalog-retry-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('book-card-2')).toBeTruthy();
    });
  });
});
