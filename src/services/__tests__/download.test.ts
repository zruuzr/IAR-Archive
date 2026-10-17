// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBookDownload } from '@/hooks/useBookDownload';
import {
  downloadBookFile,
  formatBytes,
  formatDownloadProgressMeta,
  sanitizeDownloadFileName,
  type BrowserSavePayload,
  type DownloadProgressSnapshot
} from '@/services/download';
import type { Book } from '@/types/book';

function createMockBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 12,
    title: 'دليل التخطيط الاستراتيجي',
    title_en: 'Strategic Planning Guide',
    author: 'وزارة التخطيط',
    author_en: 'Ministry of Planning',
    category: 'التخطيط الاستراتيجي',
    category_en: 'Strategic Planning',
    description: 'وصف المرجع',
    description_en: 'Reference description',
    publisher: 'وزارة التخطيط',
    publisher_en: 'Ministry of Planning',
    type: 'دليل',
    type_en: 'Guide',
    target_audience: 'الباحثون',
    target_audience_en: 'Researchers',
    badge_text: '',
    badge_text_en: '',
    year: '2024',
    pages: '120',
    file_size: '2.5 MB',
    keywords: [],
    keywords_en: [],
    key_points: [],
    key_points_en: [],
    featured: false,
    cover_image: 'http://localhost/covers/12.png',
    file_path: 'pdf/12.pdf',
    file_name: '12.pdf',
    downloadCount: 4,
    publicRating: 4.5,
    ratingSum: 9,
    ratingCount: 2,
    voters: [],
    ...overrides
  };
}

function createChunkedStreamResponse(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
  onCancel?: () => void
): Response {
  let index = 0;
  const body = {
    getReader: () => ({
      read: async () => {
        if (index < chunks.length) {
          const value = chunks[index++];
          return { done: false, value };
        }
        return { done: true, value: undefined };
      },
      cancel: async () => {
        onCancel?.();
      }
    })
  };

  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) => {
        const lower = name.toLowerCase();
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) return v;
        }
        return null;
      }
    },
    body
  } as unknown as Response;
}

describe('Streaming Download Service & useBookDownload Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1 & 2. completes a streaming download, updates progress accurately without premature 100%, and records metrics after completion', async () => {
    const chunk1 = new Uint8Array(1024).fill(65); // 1 KB
    const chunk2 = new Uint8Array(1024).fill(66); // 1 KB
    const chunk3 = new Uint8Array(2048).fill(67); // 2 KB (Total = 4096 B)

    const snapshots: DownloadProgressSnapshot[] = [];
    const savedPayloads: BrowserSavePayload[] = [];
    const recordDownloadSpy = vi.fn(async () => ({
      ok: true,
      skipped: false,
      reason: null,
      downloadCount: 5,
      error: null
    }));

    const mockFetch = vi.fn(async () =>
      createChunkedStreamResponse([chunk1, chunk2, chunk3], {
        'Content-Length': '4096',
        'Content-Type': 'application/pdf'
      })
    );

    const book = createMockBook();
    const result = await downloadBookFile(book, {
      onProgress: (snap) => snapshots.push(snap),
      deps: {
        fetchImpl: mockFetch as unknown as typeof fetch,
        triggerBrowserSave: (payload) => {
          // Verify metrics have NOT been recorded before browser save is triggered
          expect(recordDownloadSpy).not.toHaveBeenCalled();
          savedPayloads.push(payload);
        },
        recordDownloadImpl: recordDownloadSpy
      }
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe('COMPLETED');
    expect(result.receivedBytes).toBe(4096);
    expect(result.totalBytes).toBe(4096);
    expect(result.metricsRecorded).toBe(true);
    expect(result.downloadCount).toBe(5);

    expect(savedPayloads).toHaveLength(1);
    expect(savedPayloads[0].fileName).toBe('12.pdf');
    expect(savedPayloads[0].blob.size).toBe(4096);

    // Verify progress phases: connecting -> streaming (25%, 50%, 100%) -> finalizing -> completed
    const streamingPercents = snapshots
      .filter((s) => s.phase === 'streaming' && s.receivedBytes > 0)
      .map((s) => s.percent);
    expect(streamingPercents).toEqual([25, 50, 100]);
    expect(snapshots[0].phase).toBe('connecting');
    expect(snapshots[snapshots.length - 1].phase).toBe('completed');

    expect(recordDownloadSpy).toHaveBeenCalledTimes(1);
    expect(recordDownloadSpy).toHaveBeenCalledWith(
      12,
      expect.objectContaining({
        completed: true,
        aborted: false
      })
    );
  });

  it('3. handles responses without Content-Length (indeterminate progress)', async () => {
    const chunk1 = new Uint8Array(2048).fill(1);
    const chunk2 = new Uint8Array(1024).fill(2);
    const snapshots: DownloadProgressSnapshot[] = [];

    const mockFetch = vi.fn(async () =>
      createChunkedStreamResponse([chunk1, chunk2], {
        'Content-Type': 'application/pdf'
      })
    );

    const result = await downloadBookFile(createMockBook(), {
      recordMetrics: false,
      onProgress: (snap) => snapshots.push(snap),
      deps: {
        fetchImpl: mockFetch as unknown as typeof fetch,
        triggerBrowserSave: vi.fn()
      }
    });

    expect(result.ok).toBe(true);
    expect(result.receivedBytes).toBe(3072);
    expect(result.totalBytes).toBe(0);

    const streamingSnaps = snapshots.filter(
      (s) => s.phase === 'streaming' && s.receivedBytes > 0
    );
    expect(streamingSnaps.every((s) => s.isIndeterminate)).toBe(true);
    expect(streamingSnaps.every((s) => s.percent === null)).toBe(true);
    expect(streamingSnaps[0].metaText).toBe('2.0 KB');
    expect(streamingSnaps[1].metaText).toBe('3.0 KB');
  });

  it('4, 5 & 8. handles HTTP errors and network failures and never records a completed download', async () => {
    const recordDownloadSpy = vi.fn();

    // Case 4: HTTP 404
    const httpErrorResult = await downloadBookFile(createMockBook(), {
      lang: 'en',
      deps: {
        fetchImpl: (async () => ({
          ok: false,
          status: 404,
          headers: { get: () => null }
        })) as unknown as typeof fetch,
        recordDownloadImpl: recordDownloadSpy
      }
    });

    expect(httpErrorResult.ok).toBe(false);
    expect(httpErrorResult.code).toBe('HTTP_ERROR');
    expect(httpErrorResult.metricsRecorded).toBe(false);
    expect(recordDownloadSpy).not.toHaveBeenCalled();

    // Case 5: Network failure
    const networkErrorResult = await downloadBookFile(createMockBook(), {
      lang: 'ar',
      deps: {
        fetchImpl: (async () => {
          throw new TypeError('Failed to fetch');
        }) as unknown as typeof fetch,
        recordDownloadImpl: recordDownloadSpy
      }
    });

    expect(networkErrorResult.ok).toBe(false);
    expect(networkErrorResult.code).toBe('NETWORK_ERROR');
    expect(networkErrorResult.metricsRecorded).toBe(false);
    expect(recordDownloadSpy).not.toHaveBeenCalled();
  });

  it('6 & 8. supports mid-stream cancellation via AbortController, cancels reader, and does not record metrics', async () => {
    const controller = new AbortController();
    let readerCancelled = false;
    const recordDownloadSpy = vi.fn();

    let readCount = 0;
    const mockFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (k: string) => (k === 'Content-Length' ? '10000' : null) },
      body: {
        getReader: () => ({
          read: async () => {
            readCount += 1;
            if (readCount === 1) {
              return { done: false, value: new Uint8Array(1000) };
            }
            // Abort right after the first chunk
            controller.abort();
            return { done: false, value: new Uint8Array(1000) };
          },
          cancel: async () => {
            readerCancelled = true;
          }
        })
      }
    }));

    const result = await downloadBookFile(createMockBook(), {
      signal: controller.signal,
      lang: 'ar',
      deps: {
        fetchImpl: mockFetch as unknown as typeof fetch,
        recordDownloadImpl: recordDownloadSpy
      }
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('ABORTED');
    expect(result.message).toBe('تم إلغاء التحميل.');
    expect(readerCancelled).toBe(true);
    expect(recordDownloadSpy).not.toHaveBeenCalled();
  });

  it('7. keeps the file download successful even if Firebase metrics recording fails after transfer', async () => {
    const chunk = new Uint8Array(512).fill(9);
    const mockFetch = vi.fn(async () =>
      createChunkedStreamResponse([chunk], { 'Content-Length': '512' })
    );
    const triggerBrowserSave = vi.fn();
    const failingRecordDownload = vi.fn(async () => {
      throw new Error('Firestore permission-denied or offline');
    });

    const result = await downloadBookFile(createMockBook(), {
      deps: {
        fetchImpl: mockFetch as unknown as typeof fetch,
        triggerBrowserSave,
        recordDownloadImpl: failingRecordDownload
      }
    });

    expect(result.ok).toBe(true);
    expect(result.code).toBe('COMPLETED');
    expect(triggerBrowserSave).toHaveBeenCalledTimes(1);
    expect(result.metricsRecorded).toBe(false);
    expect(result.downloadCount).toBeNull();
    expect(result.metricsError).toContain('Firestore permission-denied');
  });

  it('9. cleans up temporary DOM elements, revokes ObjectURL, and aborts active download on hook unmount', async () => {
    const createObjectURLSpy = vi.fn(() => 'blob:http://localhost/test-blob-123');
    const revokeObjectURLSpy = vi.fn();

    const chunk = new Uint8Array(256).fill(1);
    const mockFetch = vi.fn(async () =>
      createChunkedStreamResponse([chunk], { 'Content-Length': '256' })
    );

    const result = await downloadBookFile(createMockBook(), {
      recordMetrics: false,
      revokeDelayMs: 0,
      deps: {
        fetchImpl: mockFetch as unknown as typeof fetch,
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy
      }
    });

    expect(result.ok).toBe(true);
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(
      'blob:http://localhost/test-blob-123'
    );
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);

    // Verify useBookDownload hook state transitions & unmount cleanup
    let abortSignalFromFetch: AbortSignal | undefined;
    const hangingFetch = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          abortSignalFromFetch = init?.signal ?? undefined;
          abortSignalFromFetch?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );

    const { result: hookResult, unmount } = renderHook(() =>
      useBookDownload({
        recordMetrics: false,
        deps: { fetchImpl: hangingFetch as unknown as typeof fetch }
      })
    );

    act(() => {
      void hookResult.current.startDownload(createMockBook());
    });

    expect(hookResult.current.status).toBe('downloading');
    expect(hookResult.current.isBusy(12)).toBe(true);

    // Unmounting must abort the active request
    unmount();
    expect(abortSignalFromFetch?.aborted).toBe(true);
  });

  it('10. sanitizes unsafe or malformed filenames and formats bytes accurately', () => {
    expect(sanitizeDownloadFileName('../../etc/passwd', '', 7)).toBe('.._.._etc_passwd');
    expect(sanitizeDownloadFileName('   ', 'pdf/book%20name.pdf?token=1', 7)).toBe(
      'book name.pdf'
    );
    expect(sanitizeDownloadFileName('...', '', 42)).toBe('IAR-42.pdf');
    expect(sanitizeDownloadFileName('file\u0000name:test?.pdf', '', 5)).toBe(
      'file_name_test_.pdf'
    );

    expect(formatBytes(0)).toBe('');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
    expect(formatDownloadProgressMeta(1024, 2048)).toBe('1.0 KB / 2.0 KB');
    expect(formatDownloadProgressMeta(0, 0)).toBe('—');
  });
});
