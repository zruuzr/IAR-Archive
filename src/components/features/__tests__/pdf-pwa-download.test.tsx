// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadProgressDialog } from '@/components/features/DownloadProgressDialog';
import {
  buildPdfViewerUrl,
  DEFAULT_PDFJS_VIEWER_URL,
  PdfReaderDialog,
  resolveSafePdfUrl
} from '@/components/features/PdfReaderDialog';
import type { UseBookDownloadReturn } from '@/hooks/useBookDownload';
import { usePWAInstall, type BeforeInstallPromptEvent } from '@/hooks/usePWAInstall';
import { I18nProvider } from '@/i18n/I18nProvider';
import { GITHUB_RAW_BASE_URL } from '@/services/catalog';

describe('PdfReaderDialog & PDF.js URL safety helpers', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('resolves valid relative and GitHub blob paths to GitHub Raw and wraps them in PDF.js viewer URL', () => {
    const safeUrl = resolveSafePdfUrl('pdf/1.pdf');
    expect(safeUrl).toBe(`${GITHUB_RAW_BASE_URL}pdf/1.pdf`);

    const viewerUrl = buildPdfViewerUrl('pdf/1.pdf');
    expect(viewerUrl).toBe(
      `${DEFAULT_PDFJS_VIEWER_URL}?file=${encodeURIComponent(`${GITHUB_RAW_BASE_URL}pdf/1.pdf`)}`
    );

    const blobViewerUrl = buildPdfViewerUrl(
      'https://github.com/zruuzr/IAR-Archive/blob/main/pdf/10.pdf'
    );
    expect(blobViewerUrl).toBe(
      `${DEFAULT_PDFJS_VIEWER_URL}?file=${encodeURIComponent('https://raw.githubusercontent.com/zruuzr/IAR-Archive/main/pdf/10.pdf')}`
    );
  });

  it('rejects unsafe schemes (javascript:, data:, file:) and URLs with credentials', () => {
    expect(resolveSafePdfUrl('javascript:alert(1)')).toBeNull();
    expect(resolveSafePdfUrl('data:application/pdf;base64,AAA')).toBeNull();
    expect(resolveSafePdfUrl('file:///etc/passwd')).toBeNull();
    expect(resolveSafePdfUrl('https://user:secret@example.com/doc.pdf')).toBeNull();
    expect(resolveSafePdfUrl('')).toBeNull();
    expect(buildPdfViewerUrl('javascript:alert(1)')).toBeNull();
  });

  it('opens the correct reference in PdfReaderDialog, handles invalid file paths, and cleans up on close/Escape', () => {
    const onOpenChange = vi.fn();

    const { rerender, unmount } = render(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog
          open={true}
          onOpenChange={onOpenChange}
          book={{
            id: 5,
            title: 'مرجع الإدارة المالية',
            title_en: 'Financial Administration Reference',
            file_path: 'pdf/5.pdf'
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('pdf-reader-title').textContent).toBe(
      'مرجع الإدارة المالية'
    );
    const iframe = screen.getByTestId('pdf-reader-iframe') as HTMLIFrameElement;
    expect(iframe.src).toContain(encodeURIComponent(`${GITHUB_RAW_BASE_URL}pdf/5.pdf`));
    expect(document.body.style.overflow).toBe('hidden');

    // Pressing Escape calls onOpenChange(false)
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Rerender with invalid/empty file_path shows error state instead of iframe
    rerender(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog
          open={true}
          onOpenChange={onOpenChange}
          book={{
            id: 5,
            title: 'مرجع بدون ملف',
            title_en: 'Missing File Reference',
            file_path: ''
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('pdf-reader-error')).toBeTruthy();
    expect(screen.queryByTestId('pdf-reader-iframe')).toBeNull();

    // Closing dialog restores body overflow
    rerender(
      <I18nProvider initialLang="ar">
        <PdfReaderDialog open={false} onOpenChange={onOpenChange} book={null} />
      </I18nProvider>
    );
    expect(document.body.style.overflow).toBe('');
    unmount();
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
