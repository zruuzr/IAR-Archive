// @vitest-environment jsdom
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadProgressDialog } from '@/components/features/DownloadProgressDialog';
import { PdfReaderDialog } from '@/components/features/PdfReaderDialog';
import * as pdfEngine from '@/components/features/pdf-reader/pdf-engine';
import { resolveSafePdfUrl } from '@/components/features/pdf-reader/pdf-engine';
import type { UseBookDownloadReturn } from '@/hooks/useBookDownload';
import { usePWAInstall, type BeforeInstallPromptEvent } from '@/hooks/usePWAInstall';
import { I18nProvider } from '@/i18n/I18nProvider';
import { GITHUB_RAW_BASE_URL } from '@/services/catalog';
import type { Book } from '@/types/book';

function makeTestBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 5,
    title: 'مرجع الإدارة المالية',
    title_en: 'Financial Administration Reference',
    author: 'د. سعاد الرافدين',
    author_en: 'Dr. Suad Al-Rafidain',
    category: 'الإدارة العامة',
    category_en: 'Public Administration',
    description: 'وصف المرجع الإداري.',
    description_en: 'Reference description.',
    publisher: 'دار بغداد',
    publisher_en: 'Baghdad House',
    type: 'كتاب',
    type_en: 'Book',
    target_audience: 'الباحثون',
    target_audience_en: 'Researchers',
    badge_text: '',
    badge_text_en: '',
    year: '2024',
    pages: '3',
    file_size: '2.4 MB',
    keywords: ['إدارة'],
    keywords_en: ['management'],
    key_points: [],
    key_points_en: [],
    featured: false,
    cover_image: '',
    file_path: 'pdf/5.pdf',
    file_name: 'reference-5.pdf',
    downloadCount: 0,
    publicRating: 0,
    ratingSum: 0,
    ratingCount: 0,
    voters: [],
    ...overrides
  };
}

function createMockPdfDoc() {
  const destroy = vi.fn().mockResolvedValue(undefined);
  const pageTexts: Record<number, string> = {
    1: 'الإدارةُ العامّةُ في العراق الحديث',
    2: 'الحوكمة الرشيدة والتخطيط الاستراتيجي',
    3: 'خاتمة البحث والمصادر الإدارية'
  };
  const getPage = vi.fn(async (pageNumber: number) => ({
    pageNumber,
    getViewport: ({ scale }: { scale: number; rotation?: number }) => ({
      width: 600 * scale,
      height: 800 * scale,
      scale
    }),
    render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    getTextContent: async () => ({
      items: [{ str: pageTexts[pageNumber] ?? '' }]
    }),
    cleanup: vi.fn()
  }));

  return {
    numPages: 3,
    getPage,
    getOutline: async () => [{ title: 'الفصل الأول', dest: null, items: [] }],
    getDestination: async () => null,
    getPageIndex: async () => 0,
    destroy
  };
}

describe('PdfReaderDialog & self-hosted PDF engine helpers', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    vi.restoreAllMocks();
  });

  it('resolves valid relative and GitHub blob paths and rejects unsafe URLs', () => {
    expect(resolveSafePdfUrl('pdf/1.pdf')).toBe(`${GITHUB_RAW_BASE_URL}pdf/1.pdf`);
    expect(
      resolveSafePdfUrl('https://github.com/zruuzr/IAR-Archive/blob/main/pdf/10.pdf')
    ).toBe('https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/pdf/10.pdf');

    expect(resolveSafePdfUrl('javascript:alert(1)')).toBeNull();
    expect(resolveSafePdfUrl('data:application/pdf;base64,AAA')).toBeNull();
    expect(resolveSafePdfUrl('file:///etc/passwd')).toBeNull();
    expect(resolveSafePdfUrl('https://user:secret@example.com/doc.pdf')).toBeNull();
    expect(resolveSafePdfUrl('')).toBeNull();
  });

  it('computes accurate fit scales, zoom steps, codex spreads, and normalized Arabic matches', () => {
    const widthScale = pdfEngine.computePageScale({
      zoom: 'fit-width',
      baseWidth: 600,
      baseHeight: 800,
      stageWidth: 948,
      stageHeight: 700,
      layoutMode: 'continuous'
    });
    expect(widthScale).toBeCloseTo(880 / 600, 2);

    const spreadScale = pdfEngine.computePageScale({
      zoom: 'fit-page',
      baseWidth: 600,
      baseHeight: 800,
      stageWidth: 1000,
      stageHeight: 680,
      layoutMode: 'book',
      isSpreadPair: true
    });
    expect(spreadScale).toBeGreaterThan(0.5);
    expect(pdfEngine.stepZoom(1, 'in')).toBe(1.15);
    expect(pdfEngine.stepZoom(1, 'out')).toBe(0.9);
    expect(pdfEngine.buildBookSpreads(5)).toEqual([[1], [2, 3], [4, 5]]);
    expect(pdfEngine.getSpreadForPage(5, 3)).toEqual([2, 3]);
    expect(
      pdfEngine.countNormalizedTextMatches(
        'الإدارةُ العامّةُ والموارد البشرية',
        'الادارة العامة',
        'ar'
      )
    ).toBe(1);
  });

  it('renders custom self-hosted Heritage PDF viewer, switches paper/layout modes, searches, handles errors, and restores overflow', async () => {
    const mockDoc = createMockPdfDoc();
    vi.spyOn(pdfEngine, 'loadPdfJs').mockResolvedValue({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve(mockDoc),
        destroy: vi.fn(),
        onProgress: null
      })),
      GlobalWorkerOptions: { workerSrc: '' }
    } as unknown as Awaited<ReturnType<typeof pdfEngine.loadPdfJs>>);

    const onOpenChange = vi.fn();
    const book = makeTestBook();

    const { rerender, unmount } = render(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog open={true} onOpenChange={onOpenChange} book={book} />
      </I18nProvider>
    );

    expect(screen.getByTestId('pdf-reader-title').textContent).toBe(
      'مرجع الإدارة المالية'
    );
    // Must not embed an external Mozilla iframe
    expect(document.querySelector('iframe')).toBeNull();
    expect((screen.getByTestId('pdf-reader-direct-link') as HTMLAnchorElement).href).toBe(
      `${GITHUB_RAW_BASE_URL}pdf/5.pdf`
    );
    expect(document.body.style.overflow).toBe('hidden');

    await waitFor(() => {
      expect(
        screen.getByTestId('pdf-reader-stage').querySelector('[data-page-number="1"]')
      ).not.toBeNull();
    });

    // Switch paper mode to parchment and confirm attribute propagates
    fireEvent.click(screen.getByRole('button', { name: 'رقّ' }));
    expect(
      screen
        .getByTestId('pdf-reader-stage')
        .querySelector('[data-page-number="1"]')
        ?.getAttribute('data-paper-mode')
    ).toBe('parchment');

    // Toggle Arabic search bar and execute search across pages
    fireEvent.click(screen.getByTestId('pdf-reader-search-toggle'));
    const searchInput = screen.getByTestId('pdf-reader-search-input');
    fireEvent.change(searchInput, { target: { value: 'الحوكمة' } });
    await waitFor(() => {
      expect(screen.getByText('1 / 1')).toBeTruthy();
    });

    // Pressing Escape calls onOpenChange(false)
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Rerender with invalid/empty file_path shows localized Heritage error state
    rerender(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog
          open={true}
          onOpenChange={onOpenChange}
          book={makeTestBook({
            title: 'مرجع بدون ملف',
            title_en: 'Missing File Reference',
            file_path: ''
          })}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('pdf-reader-error')).toBeTruthy();

    // Closing dialog restores body overflow
    rerender(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog open={false} onOpenChange={onOpenChange} book={null} />
      </I18nProvider>
    );
    expect(document.body.style.overflow).toBe('');
    unmount();
  });

  it('enforces accessible toolbar ARIA contracts, overflow menu Escape layering, theater-mode fallback, zoom bounds, and rotation state', async () => {
    const mockDoc = createMockPdfDoc();
    vi.spyOn(pdfEngine, 'loadPdfJs').mockResolvedValue({
      getDocument: vi.fn(() => ({
        promise: Promise.resolve(mockDoc),
        destroy: vi.fn(),
        onProgress: null
      })),
      GlobalWorkerOptions: { workerSrc: '' }
    } as unknown as Awaited<ReturnType<typeof pdfEngine.loadPdfJs>>);

    const prevFsDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'fullscreenEnabled'
    );
    Object.defineProperty(document, 'fullscreenEnabled', {
      value: false,
      configurable: true
    });

    const onOpenChange = vi.fn();
    try {
      const { unmount } = render(
        <I18nProvider initialLang="ar">
          <PdfReaderDialog
            open={true}
            onOpenChange={onOpenChange}
            book={makeTestBook()}
          />
        </I18nProvider>
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('pdf-reader-stage').querySelector('[data-page-number="1"]')
        ).not.toBeNull();
      });

      const sidebarToggle = screen.getByTestId('pdf-reader-sidebar-toggle');
      expect(sidebarToggle.getAttribute('aria-controls')).toBe('pdf-reader-sidebar');
      expect(sidebarToggle.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById('pdf-reader-sidebar')).not.toBeNull();
      fireEvent.click(sidebarToggle);
      expect(sidebarToggle.getAttribute('aria-expanded')).toBe('false');
      expect(document.getElementById('pdf-reader-sidebar')).toBeNull();

      const searchToggle = screen.getByTestId('pdf-reader-search-toggle');
      expect(searchToggle.getAttribute('aria-controls')).toBe('pdf-reader-searchbar');
      expect(searchToggle.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(searchToggle);
      expect(searchToggle.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById('pdf-reader-searchbar')).not.toBeNull();

      // Zoom bounds disable Zoom Out when reaching minimum preset step (0.4)
      const zoomSelect = screen.getAllByLabelText(
        'مستوى التكبير'
      )[0] as HTMLSelectElement;
      fireEvent.change(zoomSelect, { target: { value: '0.5' } });
      const zoomOutBtn = screen.getAllByRole('button', {
        name: 'تصغير'
      })[0] as HTMLButtonElement;
      expect(zoomOutBtn.disabled).toBe(false);
      fireEvent.click(zoomOutBtn);
      await waitFor(() => {
        expect(
          (screen.getAllByRole('button', { name: 'تصغير' })[0] as HTMLButtonElement)
            .disabled
        ).toBe(true);
      });

      // Rotate toggles pressed state cleanly
      const rotateBtn = screen.getAllByRole('button', {
        name: 'تدوير الصفحات 90 درجة'
      })[0];
      expect(rotateBtn.getAttribute('aria-pressed')).toBe('false');
      fireEvent.click(rotateBtn);
      expect(rotateBtn.getAttribute('aria-pressed')).toBe('true');

      // Overflow menu Escape layering: closes menu without dismissing modal
      const moreBtn = screen.getByTestId('pdf-reader-more');
      expect(moreBtn.getAttribute('aria-haspopup')).toBe('menu');
      expect(moreBtn.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(moreBtn);
      expect(moreBtn.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByTestId('pdf-reader-overflow-menu')).toBeTruthy();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByTestId('pdf-reader-overflow-menu')).toBeNull();
      expect(moreBtn.getAttribute('aria-expanded')).toBe('false');
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      // Theater-mode fallback when fullscreenEnabled is false
      const expandBtn = screen.getByRole('button', { name: 'توسيع القارئ' });
      expect(expandBtn.getAttribute('aria-pressed')).toBe('false');
      fireEvent.click(expandBtn);
      const collapseBtn = screen.getByRole('button', { name: 'تصغير القارئ' });
      expect(collapseBtn.getAttribute('aria-pressed')).toBe('true');
      expect(document.querySelector('.hx-pdf-panel--fullscreen')).not.toBeNull();

      // First Escape exits theater mode without closing the modal
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(document.querySelector('.hx-pdf-panel--fullscreen')).toBeNull();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      // Next Escape closes the modal
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onOpenChange).toHaveBeenCalledWith(false);

      unmount();
    } finally {
      if (prevFsDescriptor) {
        Object.defineProperty(document, 'fullscreenEnabled', prevFsDescriptor);
      } else {
        delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
      }
    }
  });
});

describe('DownloadProgressDialog component', () => {
  it('renders determinate and indeterminate progress states and triggers cancel/dismiss', () => {
    const cancelSpy = vi.fn();
    const dismissSpy = vi.fn();

    const baseState: UseBookDownloadReturn = {
      status: 'downloading',
      activeBook: {
        id: 1,
        title: 'مرجع تجريبي',
        title_en: 'Test Reference',
        author: '',
        author_en: '',
        category: '',
        category_en: '',
        description: '',
        description_en: '',
        publisher: '',
        publisher_en: '',
        type: '',
        type_en: '',
        target_audience: '',
        target_audience_en: '',
        badge_text: '',
        badge_text_en: '',
        year: '2025',
        pages: '100',
        file_size: '2 MB',
        keywords: [],
        keywords_en: [],
        key_points: [],
        key_points_en: [],
        featured: false,
        cover_image: '',
        file_path: 'pdf/1.pdf',
        file_name: '1.pdf',
        downloadCount: 0,
        publicRating: 0,
        ratingSum: 0,
        ratingCount: 0,
        voters: []
      },
      receivedBytes: 1024,
      totalBytes: 2048,
      percent: 50,
      isIndeterminate: false,
      metaText: '1.0 KB / 2.0 KB',
      statusMessage: null,
      errorCode: null,
      isDownloading: true,
      isBusy: () => true,
      startDownload: vi.fn(),
      cancelDownload: cancelSpy,
      dismissDownload: dismissSpy
    };

    const { rerender } = render(
      <I18nProvider initialLang="ar">
        <DownloadProgressDialog downloadState={baseState} />
      </I18nProvider>
    );

    expect(screen.getByTestId('download-percent').textContent).toBe('50');
    expect(screen.getByTestId('download-meta').textContent).toBe('1.0 KB / 2.0 KB');

    fireEvent.click(screen.getByTestId('download-cancel-btn'));
    expect(cancelSpy).toHaveBeenCalledTimes(1);

    // Rerender in indeterminate state
    rerender(
      <I18nProvider initialLang="ar">
        <DownloadProgressDialog
          downloadState={{
            ...baseState,
            percent: null,
            isIndeterminate: true,
            metaText: '3.5 KB'
          }}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('download-percent').textContent).toBe('—');

    // Rerender in completed state
    rerender(
      <I18nProvider initialLang="ar">
        <DownloadProgressDialog
          downloadState={{
            ...baseState,
            status: 'completed',
            isDownloading: false,
            percent: 100,
            statusMessage: 'تم إرسال الملف إلى المتصفح.'
          }}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('download-status-heading').textContent).toBe(
      'تم إرسال الملف إلى المتصفح.'
    );
    fireEvent.click(screen.getByTestId('download-dismiss-btn'));
    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});

describe('usePWAInstall hook', () => {
  beforeEach(() => {
    window.__iarInstallPrompt = null;
    window.__iarPWAReady = null;
  });

  it('distinguishes absence of install event, captures beforeinstallprompt, prompts user, and tracks appinstalled', async () => {
    const { result } = renderHook(() => usePWAInstall({ lang: 'ar' }));

    // 1. Absence of beforeinstallprompt event -> isInstallPromptAvailable is strictly false
    expect(result.current.isInstallPromptAvailable).toBe(false);
    expect(result.current.isInstalled).toBe(false);

    // Calling promptInstall when unavailable returns unavailable & shows manual instructions
    let unavailableOutcome:
      Awaited<ReturnType<typeof result.current.promptInstall>> | undefined;
    await act(async () => {
      unavailableOutcome = await result.current.promptInstall();
    });
    expect(unavailableOutcome?.prompted).toBe(false);
    expect(unavailableOutcome?.outcome).toBe('unavailable');
    expect(result.current.manualInstructionsShown).toBe(true);

    // 2. Receive beforeinstallprompt event
    const promptSpy = vi.fn(async () => undefined);
    const fakePromptEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.defineProperty(fakePromptEvent, 'prompt', { value: promptSpy });
    Object.defineProperty(fakePromptEvent, 'userChoice', {
      value: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    });

    act(() => {
      window.dispatchEvent(fakePromptEvent);
    });

    expect(result.current.isInstallPromptAvailable).toBe(true);
    expect(result.current.manualInstructionsShown).toBe(false);

    // 3. Trigger install prompt
    let installOutcome:
      Awaited<ReturnType<typeof result.current.promptInstall>> | undefined;
    await act(async () => {
      installOutcome = await result.current.promptInstall();
    });

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(installOutcome?.prompted).toBe(true);
    expect(installOutcome?.outcome).toBe('accepted');
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallPromptAvailable).toBe(false);

    // 4. Dispatch appinstalled event explicitly
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.isInstalled).toBe(true);
    expect(result.current.isInstallPromptAvailable).toBe(false);
  });
});
