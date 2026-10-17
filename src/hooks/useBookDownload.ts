import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadBookFile,
  getDownloadResultMessage,
  type DownloadBookDeps,
  type DownloadBookOptions,
  type DownloadBookResult,
  type DownloadErrorCode,
  type DownloadProgressSnapshot
} from '@/services/download';
import type { Book, Language } from '@/types/book';

export type BookDownloadStatus =
  'idle' | 'downloading' | 'completed' | 'cancelled' | 'error';

export interface UseBookDownloadOptions {
  lang?: Language;
  recordMetrics?: boolean;
  defaultDownloadOptions?: Omit<DownloadBookOptions, 'onProgress' | 'signal' | 'lang'>;
  deps?: DownloadBookDeps;
  onDownloadCountUpdated?: (bookId: number, downloadCount: number) => void;
  onDownloadComplete?: (result: DownloadBookResult) => void;
  onDownloadError?: (result: DownloadBookResult) => void;
}

export interface UseBookDownloadReturn {
  status: BookDownloadStatus;
  activeBook: Book | null;
  receivedBytes: number;
  totalBytes: number;
  percent: number | null;
  isIndeterminate: boolean;
  metaText: string;
  statusMessage: string | null;
  errorCode: DownloadErrorCode | null;
  isDownloading: boolean;
  isBusy: (bookId: number) => boolean;
  startDownload: (
    book: Book,
    overrideOptions?: Partial<DownloadBookOptions>
  ) => Promise<DownloadBookResult | null>;
  cancelDownload: () => void;
  dismissDownload: () => void;
}

/**
 * React hook managing single-active streaming PDF downloads (`downloadBookFile`).
 *
 * Guarantees:
 * - Prevents overlapping concurrent downloads (matching `state.meta.busyDownloads` / `downloadAbort` in `js/download.js`).
 * - Supports mid-stream cancellation via `AbortController` (`cancelDownload()`).
 * - Automatically aborts any in-flight download when the component unmounts.
 * - Guards all state updates with a monotonic operation ID so cancelled or stale operations
 *   can never overwrite state.
 * - Never treats a Firebase metrics write failure as a file download failure.
 */
export function useBookDownload(
  options: UseBookDownloadOptions = {}
): UseBookDownloadReturn {
  const {
    lang = 'ar',
    recordMetrics = true,
    defaultDownloadOptions,
    deps,
    onDownloadCountUpdated,
    onDownloadComplete,
    onDownloadError
  } = options;

  const [status, setStatus] = useState<BookDownloadStatus>('idle');
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [receivedBytes, setReceivedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [percent, setPercent] = useState<number | null>(0);
  const [isIndeterminate, setIsIndeterminate] = useState<boolean>(false);
  const [metaText, setMetaText] = useState<string>('—');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<DownloadErrorCode | null>(null);

  const mountedRef = useRef<boolean>(true);
  const activeAbortRef = useRef<AbortController | null>(null);
  const activeBookIdRef = useRef<number | null>(null);
  const operationIdRef = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (activeAbortRef.current) {
        try {
          activeAbortRef.current.abort();
        } catch {
          // Ignore abort errors on unmount
        }
        activeAbortRef.current = null;
      }
    };
  }, []);

  const isBusy = useCallback((bookId: number): boolean => {
    return activeAbortRef.current !== null && activeBookIdRef.current === bookId;
  }, []);

  const cancelDownload = useCallback((): void => {
    const controller = activeAbortRef.current;
    if (!controller) return;

    operationIdRef.current += 1;
    activeAbortRef.current = null;
    activeBookIdRef.current = null;

    try {
      controller.abort();
    } catch {
      // Ignore abort errors
    }

    if (mountedRef.current) {
      setStatus('cancelled');
      setErrorCode('ABORTED');
      setStatusMessage(getDownloadResultMessage('ABORTED', lang));
    }
  }, [lang]);

  const dismissDownload = useCallback((): void => {
    if (activeAbortRef.current) {
      cancelDownload();
    }
    if (!mountedRef.current) return;
    setStatus('idle');
    setActiveBook(null);
    setReceivedBytes(0);
    setTotalBytes(0);
    setPercent(0);
    setIsIndeterminate(false);
    setMetaText('—');
    setStatusMessage(null);
    setErrorCode(null);
  }, [cancelDownload]);

  const startDownload = useCallback(
    async (
      book: Book,
      overrideOptions?: Partial<DownloadBookOptions>
    ): Promise<DownloadBookResult | null> => {
      // Prevent starting an overlapping download while one is already in flight
      if (activeAbortRef.current !== null) {
        return null;
      }

      const opId = ++operationIdRef.current;
      const controller = new AbortController();
      activeAbortRef.current = controller;
      activeBookIdRef.current = book.id;

      if (mountedRef.current) {
        setActiveBook(book);
        setStatus('downloading');
        setReceivedBytes(0);
        setTotalBytes(0);
        setPercent(0);
        setIsIndeterminate(false);
        setMetaText('—');
        setStatusMessage(null);
        setErrorCode(null);
      }

      const handleProgress = (snapshot: DownloadProgressSnapshot) => {
        if (!mountedRef.current || operationIdRef.current !== opId) return;
        setReceivedBytes(snapshot.receivedBytes);
        setTotalBytes(snapshot.totalBytes);
        setPercent(snapshot.percent);
        setIsIndeterminate(snapshot.isIndeterminate);
        setMetaText(snapshot.metaText);
      };

      try {
        const result = await downloadBookFile(book, {
          ...defaultDownloadOptions,
          lang,
          recordMetrics,
          deps,
          ...overrideOptions,
          signal: controller.signal,
          onProgress: (snap) => {
            handleProgress(snap);
            overrideOptions?.onProgress?.(snap);
          }
        });

        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
          activeBookIdRef.current = null;
        }

        if (!mountedRef.current || operationIdRef.current !== opId) {
          return result;
        }

        if (result.ok) {
          setStatus('completed');
          setPercent(100);
          setIsIndeterminate(false);
          setStatusMessage(result.message);
          setErrorCode(null);

          if (result.downloadCount !== null && onDownloadCountUpdated) {
            onDownloadCountUpdated(book.id, result.downloadCount);
          }
          onDownloadComplete?.(result);
        } else if (result.code === 'ABORTED') {
          setStatus('cancelled');
          setErrorCode('ABORTED');
          setStatusMessage(result.message);
        } else {
          setStatus('error');
          setErrorCode(result.code === 'COMPLETED' ? null : result.code);
          setStatusMessage(result.message);
          onDownloadError?.(result);
        }

        return result;
      } finally {
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
          activeBookIdRef.current = null;
        }
      }
    },
    [
      defaultDownloadOptions,
      lang,
      recordMetrics,
      deps,
      onDownloadCountUpdated,
      onDownloadComplete,
      onDownloadError
    ]
  );

  return {
    status,
    activeBook,
    receivedBytes,
    totalBytes,
    percent,
    isIndeterminate,
    metaText,
    statusMessage,
    errorCode,
    isDownloading: status === 'downloading',
    isBusy,
    startDownload,
    cancelDownload,
    dismissDownload
  };
}
