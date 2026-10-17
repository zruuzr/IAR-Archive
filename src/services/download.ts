/* ============================================================
   IAR Archive — Streaming PDF Download Service
   TypeScript port of js/download.js with dependency injection,
   ReadableStream progress tracking, AbortController cancellation,
   safe filename normalization, and post-completion Firebase metrics.
   ============================================================ */

import { clean, resolveAssetUrl } from '@/services/catalog';
import {
  recordBookDownload,
  type RecordDownloadOptions,
  type RecordDownloadResult
} from '@/services/firebase-metrics';
import type { Book, Language } from '@/types/book';

export const DEFAULT_DOWNLOAD_TIMEOUT_MS = 120_000;
export const DEFAULT_OBJECT_URL_REVOKE_DELAY_MS = 60_000;
export const DL_RING_CIRCUMFERENCE = 2 * Math.PI * 88;

export type DownloadPhase =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'finalizing'
  | 'completed'
  | 'cancelled'
  | 'error';

export type DownloadErrorCode =
  'MISSING_FILE_PATH' | 'BUSY' | 'HTTP_ERROR' | 'NETWORK_ERROR' | 'ABORTED' | 'TIMEOUT';

export class DownloadServiceError extends Error {
  readonly code: DownloadErrorCode;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(
    code: DownloadErrorCode,
    message: string,
    options?: { status?: number; cause?: unknown }
  ) {
    super(message);
    this.name = 'DownloadServiceError';
    this.code = code;
    this.status = options?.status;
    this.cause = options?.cause;
  }
}

export interface DownloadProgressSnapshot {
  bookId: number;
  phase: DownloadPhase;
  receivedBytes: number;
  totalBytes: number;
  /**
   * Percentage in `[0, 100]` when `totalBytes > 0`, or `null` when `Content-Length`
   * is absent/zero (indeterminate progress).
   * Note: During streaming (`phase === 'streaming'`), `percent` reflects actual bytes
   * received and is never forced to 100% until the entire stream completes.
   */
  percent: number | null;
  isIndeterminate: boolean;
  metaText: string;
}

export interface BrowserSavePayload {
  blob: Blob;
  fileName: string;
  bookId: number;
}

export interface DownloadBookDeps {
  fetchImpl?: typeof fetch;
  triggerBrowserSave?: (payload: BrowserSavePayload) => void | Promise<void>;
  recordDownloadImpl?: (
    bookId: number,
    options: RecordDownloadOptions
  ) => Promise<RecordDownloadResult>;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export interface DownloadBookOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  completionDelayMs?: number;
  revokeDelayMs?: number;
  lang?: Language;
  baseHref?: string;
  onProgress?: (snapshot: DownloadProgressSnapshot) => void;
  recordMetrics?: boolean;
  metricsOptions?: Omit<RecordDownloadOptions, 'completed' | 'aborted'>;
  deps?: DownloadBookDeps;
}

export interface DownloadBookResult {
  ok: boolean;
  bookId: number;
  fileName: string;
  receivedBytes: number;
  totalBytes: number;
  code: 'COMPLETED' | DownloadErrorCode;
  message: string;
  metricsRecorded: boolean;
  downloadCount: number | null;
  metricsError: string | null;
}

/**
 * Formats a byte count into a human-readable unit (`B`, `KB`, `MB`, `GB`).
 * Equivalent to `fmtBytes(b)` in `js/download.js`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${Math.trunc(bytes)} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

export const fmtBytes = formatBytes;

/**
 * Formats the progress metadata string displayed under the progress ring.
 * Equivalent to the `dlMeta` formatting in `updateDownloadOverlay` (`js/download.js`).
 */
export function formatDownloadProgressMeta(
  receivedBytes: number,
  totalBytes: number
): string {
  if (totalBytes > 0) {
    const safeReceived = Math.max(0, receivedBytes);
    return `${formatBytes(safeReceived) || '0 B'} / ${formatBytes(totalBytes)}`;
  }
  return receivedBytes > 0 ? formatBytes(receivedBytes) : '—';
}

/**
 * Produces a safe download filename from a book's `file_name` or `file_path`,
 * stripping path separators (`/`, `\`), control characters (`<= 0x1f`), and
 * dangerous dot-only names, defaulting to `IAR-{id}.pdf`.
 *
 * Matches the filename sanitization in `js/data.js` and `src/services/catalog.ts`.
 */
export function sanitizeDownloadFileName(
  rawFileName: unknown,
  rawFilePath?: unknown,
  bookId: number = 0
): string {
  const safeId = Number.isSafeInteger(bookId) && bookId >= 0 ? bookId : 0;
  let candidate =
    clean(rawFileName) ||
    clean(rawFilePath).split('/').pop()?.split('?')[0]?.split('#')[0] ||
    '';

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    // Keep undecoded string if percent-encoding is malformed
  }

  const sanitized = Array.from(candidate, (ch) =>
    ch === '/' ||
    ch === '\\' ||
    ch === ':' ||
    ch === '*' ||
    ch === '?' ||
    ch === '"' ||
    ch === '<' ||
    ch === '>' ||
    ch === '|' ||
    ch.charCodeAt(0) <= 0x1f
      ? '_'
      : ch
  )
    .join('')
    .trim();

  // Reject empty or dot-only names (`.` or `..`)
  if (!sanitized || /^\.+$/.test(sanitized)) {
    return `IAR-${safeId}.pdf`;
  }

  return sanitized;
}

/**
 * Computes a `DownloadProgressSnapshot` for a given transfer state.
 */
export function createProgressSnapshot(
  bookId: number,
  phase: DownloadPhase,
  receivedBytes: number,
  totalBytes: number
): DownloadProgressSnapshot {
  const safeReceived = Math.max(0, receivedBytes);
  const safeTotal = Math.max(0, totalBytes);
  const isIndeterminate = safeTotal <= 0;

  let percent: number | null = null;
  if (!isIndeterminate) {
    const ratio = Math.max(0, Math.min(1, safeReceived / safeTotal));
    // While still streaming chunks, cap displayed percentage at 99% until stream finishes
    const rawPercent = Math.round(ratio * 100);
    percent =
      phase === 'streaming' && safeReceived < safeTotal
        ? Math.min(99, rawPercent)
        : rawPercent;
  }

  return {
    bookId,
    phase,
    receivedBytes: safeReceived,
    totalBytes: safeTotal,
    percent,
    isIndeterminate,
    metaText: formatDownloadProgressMeta(safeReceived, safeTotal)
  };
}

/**
 * Returns the localized user-facing message for a download outcome, matching `js/download.js`.
 */
export function getDownloadResultMessage(
  code: 'COMPLETED' | DownloadErrorCode,
  lang: Language = 'ar'
): string {
  if (code === 'COMPLETED') {
    return lang === 'ar' ? 'تم إرسال الملف إلى المتصفح.' : 'File sent to your browser.';
  }
  if (code === 'ABORTED') {
    return lang === 'ar' ? 'تم إلغاء التحميل.' : 'Download cancelled.';
  }
  if (code === 'MISSING_FILE_PATH') {
    return lang === 'ar' ? 'ملف المرجع غير متاح.' : 'Reference file unavailable.';
  }
  return lang === 'ar'
    ? 'تعذّر التحميل. جرّب فتح الملف من زر القراءة؛ قد يمنع المصدر التحميل المباشر.'
    : 'Download failed. Try opening the file with Read; the source may restrict direct downloads.';
}

/**
 * Default browser file-save trigger using a temporary `<a download>` element and `ObjectURL`.
 * Cleans up the DOM element immediately and revokes the `ObjectURL` after `revokeDelayMs`.
 */
export function triggerDefaultBrowserSave(
  payload: BrowserSavePayload,
  options: {
    revokeDelayMs?: number;
    createObjectURL?: (blob: Blob) => string;
    revokeObjectURL?: (url: string) => void;
  } = {}
): void {
  const {
    revokeDelayMs = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
    createObjectURL = (b: Blob) => URL.createObjectURL(b),
    revokeObjectURL = (u: string) => URL.revokeObjectURL(u)
  } = options;

  const objectUrl = createObjectURL(payload.blob);
  try {
    if (typeof document !== 'undefined' && document.body) {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = payload.fileName;
      link.style.display = 'none';
      document.body.append(link);
      link.click();
      link.remove();
    }
  } finally {
    if (revokeDelayMs <= 0) {
      try {
        revokeObjectURL(objectUrl);
      } catch {
        // Ignore revoke errors
      }
    } else {
      const timer = setTimeout(() => {
        try {
          revokeObjectURL(objectUrl);
        } catch {
          // Ignore revoke errors
        }
      }, revokeDelayMs);
      // Do not keep Node/Vitest event loop alive solely for ObjectURL cleanup
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
        (timer as { unref: () => void }).unref();
      }
    }
  }
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: unknown }).name) : '';
  return name === 'AbortError';
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof DownloadServiceError && error.code === 'TIMEOUT') return true;
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: unknown }).name) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';
  return name === 'TimeoutError' || message === 'Timeout';
}

/**
 * Streams a book's PDF file, reports chunk-by-chunk progress, dispatches the completed `Blob`
 * to the browser save dialog, and records the download metric in Firestore only after completion.
 *
 * Architectural & memory note (matching `js/download.js`):
 * - Uses `response.body.getReader()` (`ReadableStream`) when supported by the runtime to read
 *   `Uint8Array` chunks and compute real-time progress against `Content-Length`.
 * - Accumulates chunks in memory to assemble a single `Blob` (`application/pdf`) at the end of
 *   the stream before triggering `<a download>`. For typical reference PDFs (1–40 MB), in-memory
 *   `Blob` assembly is well within browser limits; if cancelled early via `AbortController`,
 *   `reader.cancel()` is invoked and collected chunks are released for garbage collection.
 */
export async function downloadBookFile(
  book: Pick<Book, 'id' | 'title' | 'file_path' | 'file_name'>,
  options: DownloadBookOptions = {}
): Promise<DownloadBookResult> {
  const {
    signal: externalSignal,
    timeoutMs = DEFAULT_DOWNLOAD_TIMEOUT_MS,
    completionDelayMs = 0,
    revokeDelayMs = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
    lang = 'ar',
    baseHref,
    onProgress,
    recordMetrics = true,
    metricsOptions,
    deps
  } = options;

  const bookId = book.id;
  const safeFileName = sanitizeDownloadFileName(book.file_name, book.file_path, bookId);
  const resolvedUrl = resolveAssetUrl(book.file_path, true, baseHref);

  if (!resolvedUrl) {
    const code: DownloadErrorCode = 'MISSING_FILE_PATH';
    return {
      ok: false,
      bookId,
      fileName: safeFileName,
      receivedBytes: 0,
      totalBytes: 0,
      code,
      message: getDownloadResultMessage(code, lang),
      metricsRecorded: false,
      downloadCount: null,
      metricsError: null
    };
  }

  const fetchFn = deps?.fetchImpl ?? globalThis.fetch;
  const recordDownloadFn = deps?.recordDownloadImpl ?? recordBookDownload;

  const controller = new AbortController();
  let timedOut = false;

  const handleExternalAbort = () => {
    try {
      controller.abort(externalSignal?.reason);
    } catch {
      // Ignore abort errors
    }
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      handleExternalAbort();
    } else {
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort(new DownloadServiceError('TIMEOUT', 'Timeout'));
    } catch {
      // Ignore abort errors
    }
  }, timeoutMs);

  let receivedBytes = 0;
  let totalBytes = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const emitProgress = (phase: DownloadPhase, received: number, total: number) => {
    if (!onProgress) return;
    onProgress(createProgressSnapshot(bookId, phase, received, total));
  };

  try {
    if (controller.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    emitProgress('connecting', 0, 0);

    const response = await fetchFn(resolvedUrl, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new DownloadServiceError(
        'HTTP_ERROR',
        `Download unavailable (HTTP ${response.status})`,
        { status: response.status }
      );
    }

    const contentLengthHeader = response.headers?.get?.('Content-Length');
    const parsedLength = Number(contentLengthHeader);
    totalBytes =
      Number.isFinite(parsedLength) && parsedLength > 0 ? Math.trunc(parsedLength) : 0;

    reader =
      response.body && typeof response.body.getReader === 'function'
        ? response.body.getReader()
        : null;

    let blob: Blob;
    if (reader) {
      const chunks: BlobPart[] = [];
      emitProgress('streaming', 0, totalBytes);

      for (;;) {
        if (controller.signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          const chunkCopy = new Uint8Array(value.byteLength);
          chunkCopy.set(value);
          chunks.push(chunkCopy);
          receivedBytes += value.byteLength;
          emitProgress('streaming', receivedBytes, totalBytes);
        }
      }

      const mime = response.headers?.get?.('Content-Type') || 'application/pdf';
      blob = new Blob(chunks, { type: mime });
    } else {
      emitProgress('streaming', 0, 0);
      blob = await response.blob();
      receivedBytes = blob.size;
    }

    if (controller.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const finalTotal = totalBytes > 0 ? totalBytes : receivedBytes;
    emitProgress('finalizing', finalTotal, totalBytes);

    if (deps?.triggerBrowserSave) {
      await deps.triggerBrowserSave({
        blob,
        fileName: safeFileName,
        bookId
      });
    } else {
      triggerDefaultBrowserSave(
        {
          blob,
          fileName: safeFileName,
          bookId
        },
        {
          revokeDelayMs,
          createObjectURL: deps?.createObjectURL,
          revokeObjectURL: deps?.revokeObjectURL
        }
      );
    }

    if (completionDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, completionDelayMs));
    }

    emitProgress('completed', finalTotal, totalBytes);

    // Record download in Firebase ONLY after file transfer & browser delivery succeeded.
    // Failure of Firebase metrics must NEVER turn a completed file transfer into an error.
    let metricsRecorded = false;
    let downloadCount: number | null = null;
    let metricsError: string | null = null;

    if (recordMetrics) {
      try {
        const metricResult = await recordDownloadFn(bookId, {
          ...metricsOptions,
          completed: true,
          aborted: false
        });
        metricsRecorded = metricResult.ok;
        downloadCount = metricResult.downloadCount;
        metricsError = metricResult.error;
      } catch (metricErr) {
        metricsRecorded = false;
        downloadCount = null;
        metricsError =
          metricErr instanceof Error ? metricErr.message : 'Metrics write failed';
      }
    }

    return {
      ok: true,
      bookId,
      fileName: safeFileName,
      receivedBytes: finalTotal,
      totalBytes,
      code: 'COMPLETED',
      message: getDownloadResultMessage('COMPLETED', lang),
      metricsRecorded,
      downloadCount,
      metricsError
    };
  } catch (err) {
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // Ignore reader cancel errors
      }
    }

    let code: DownloadErrorCode = 'NETWORK_ERROR';
    if (timedOut || isTimeoutError(err) || isTimeoutError(controller.signal.reason)) {
      code = 'TIMEOUT';
    } else if (isAbortError(err) || controller.signal.aborted) {
      code = 'ABORTED';
    } else if (err instanceof DownloadServiceError) {
      code = err.code;
    }

    emitProgress(code === 'ABORTED' ? 'cancelled' : 'error', receivedBytes, totalBytes);

    return {
      ok: false,
      bookId,
      fileName: safeFileName,
      receivedBytes,
      totalBytes,
      code,
      message: getDownloadResultMessage(code, lang),
      metricsRecorded: false,
      downloadCount: null,
      metricsError: null
    };
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', handleExternalAbort);
    }
  }
}
