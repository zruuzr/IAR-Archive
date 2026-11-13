import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useRef } from 'react';
import { HeritageFrieze } from '@/components/heritage';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import type { UseBookDownloadReturn } from '@/hooks/useBookDownload';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { DL_RING_CIRCUMFERENCE } from '@/services/download';

export interface DownloadProgressDialogProps {
  downloadState: UseBookDownloadReturn;
}

/**
 * Accessible download progress & status overlay dialog connected to `useBookDownload`.
 *
 * Mirrors the behavior of `#downloadOverlay` in `js/download.js` while exposing clear
 * states (`downloading`, `completed`, `cancelled`, `error`), determinate/indeterminate
 * progress, keyboard Escape handling, focus trapping, and screen-reader announcements.
 */
export function DownloadProgressDialog({ downloadState }: DownloadProgressDialogProps) {
  const {
    status,
    activeBook,
    percent,
    isIndeterminate,
    metaText,
    statusMessage,
    cancelDownload,
    dismissDownload
  } = downloadState;

  const { lang, dir, t } = useI18n();
  const actionButtonRef = useRef<HTMLButtonElement | null>(null);

  const isOpen = status !== 'idle' && activeBook !== null;
  const isDownloading = status === 'downloading';

  const dialogContainerRef = useAccessibleDialog<HTMLDivElement>({
    open: isOpen,
    onEscape: () => {
      if (isDownloading) {
        cancelDownload();
      } else {
        dismissDownload();
      }
    },
    initialFocusRef: actionButtonRef
  });

  const bookTitle = activeBook
    ? lang === 'en' && activeBook.title_en
      ? activeBook.title_en
      : activeBook.title
    : '';

  const safePercent =
    percent !== null && Number.isFinite(percent)
      ? Math.max(0, Math.min(100, Math.round(percent)))
      : null;

  const strokeDashoffset =
    safePercent !== null && !isIndeterminate
      ? DL_RING_CIRCUMFERENCE * (1 - safePercent / 100)
      : DL_RING_CIRCUMFERENCE * 0.7;

  if (!isOpen || !activeBook) {
    return null;
  }

  let headingText = t('dlTitle');
  if (status === 'completed') {
    headingText = statusMessage || t('fileSentToBrowser');
  } else if (status === 'cancelled') {
    headingText = statusMessage || t('downloadCancelled');
  } else if (status === 'error') {
    headingText = statusMessage || t('downloadFailed');
  }

  return (
    <div
      id="downloadOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlTitle"
      dir={dir}
      data-testid="download-progress-dialog"
      data-status={status}
      className="hx-dialog-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        ref={dialogContainerRef}
        className="hx-dialog-panel relative z-10 w-full max-w-sm overflow-hidden flex flex-col text-center"
      >
        <HeritageFrieze />

        <div className="p-6 flex flex-col items-center text-center space-y-4">
          {/* Progress Ring / Status Visualization */}
          <div className="relative size-36 flex items-center justify-center">
            <svg
              className={cn(
                'size-full -rotate-90 transform',
                isDownloading && isIndeterminate && 'animate-spin'
              )}
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="var(--hx-line)"
                strokeWidth="10"
              />
              <circle
                cx="100"
                cy="100"
                r="88"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={DL_RING_CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                data-testid="download-ring-fg"
                className={cn(
                  'transition-[stroke-dashoffset] duration-150',
                  status === 'error'
                    ? 'text-destructive'
                    : status === 'cancelled'
                      ? 'text-[var(--hx-muted)]'
                      : 'text-[var(--hx-gold)] dark:text-[var(--hx-gold-bright)]'
                )}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {status === 'completed' ? (
                <CheckCircle2
                  className="size-10 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                  aria-hidden="true"
                />
              ) : status === 'error' || status === 'cancelled' ? (
                <AlertTriangle
                  className={cn(
                    'size-10',
                    status === 'error' ? 'text-destructive' : 'text-[var(--hx-muted)]'
                  )}
                  aria-hidden="true"
                />
              ) : isIndeterminate ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2
                    className="size-6 animate-spin text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
                    aria-hidden="true"
                  />
                  <span
                    id="dlPercent"
                    data-testid="download-percent"
                    aria-live="polite"
                    className="font-mono text-lg font-bold text-[var(--hx-ink)]"
                  >
                    —
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-0.5">
                  <span
                    id="dlPercent"
                    data-testid="download-percent"
                    aria-live="polite"
                    className="font-mono text-2xl font-bold tabular-nums text-[var(--hx-ink)]"
                  >
                    {safePercent ?? 0}
                  </span>
                  <span className="font-mono text-xs text-[var(--hx-muted)]">%</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 w-full">
            <h3
              id="dlTitle"
              data-testid="download-status-heading"
              role={status === 'error' ? 'alert' : 'status'}
              className="font-serif font-bold text-lg sm:text-xl leading-snug text-[var(--hx-ink)]"
            >
              {headingText}
            </h3>

            <p
              id="dlBook"
              data-testid="download-book-title"
              className="text-xs sm:text-sm text-[var(--hx-ink-2)] line-clamp-2 font-medium"
            >
              {bookTitle}
            </p>

            <p
              id="dlMeta"
              data-testid="download-meta"
              className="text-xs font-mono text-[var(--hx-muted)] pt-1"
            >
              {metaText}
            </p>
          </div>

          <div className="pt-2 w-full flex justify-center">
            {isDownloading ? (
              <button
                ref={actionButtonRef}
                type="button"
                id="dlCancel"
                data-testid="download-cancel-btn"
                onClick={cancelDownload}
                className="hx-btn hx-btn-line hx-btn-sm min-w-28"
              >
                <X className="size-4" aria-hidden="true" />
                <span id="dlCancelLabel">{t('dlCancelLabel')}</span>
              </button>
            ) : (
              <button
                ref={actionButtonRef}
                type="button"
                data-testid="download-dismiss-btn"
                onClick={dismissDownload}
                className="hx-btn hx-btn-solid hx-btn-sm min-w-28"
              >
                <span>{t('txtModalClose')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
