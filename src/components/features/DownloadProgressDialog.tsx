import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
    >
      <div
        ref={dialogContainerRef}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
      >
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
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/40"
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
                    ? 'text-muted-foreground'
                    : 'text-primary'
              )}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {status === 'completed' ? (
              <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
            ) : status === 'error' || status === 'cancelled' ? (
              <AlertTriangle
                className={cn(
                  'size-10',
                  status === 'error' ? 'text-destructive' : 'text-muted-foreground'
                )}
                aria-hidden="true"
              />
            ) : isIndeterminate ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2
                  className="size-6 animate-spin text-primary"
                  aria-hidden="true"
                />
                <span
                  id="dlPercent"
                  data-testid="download-percent"
                  aria-live="polite"
                  className="text-lg font-bold"
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
                  className="text-2xl font-bold tabular-nums"
                >
                  {safePercent ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 w-full">
          <h3
            id="dlTitle"
            data-testid="download-status-heading"
            role={status === 'error' ? 'alert' : 'status'}
            className="font-semibold text-sm sm:text-base leading-snug"
          >
            {headingText}
          </h3>

          <p
            id="dlBook"
            data-testid="download-book-title"
            className="text-xs text-muted-foreground line-clamp-2 font-medium"
          >
            {bookTitle}
          </p>

          <p
            id="dlMeta"
            data-testid="download-meta"
            className="text-xs font-mono text-muted-foreground pt-1"
          >
            {metaText}
          </p>
        </div>

        <div className="pt-2 w-full flex justify-center">
          {isDownloading ? (
            <Button
              ref={actionButtonRef}
              type="button"
              id="dlCancel"
              variant="outline"
              size="sm"
              data-testid="download-cancel-btn"
              onClick={cancelDownload}
              className="min-w-28"
            >
              <X className="size-4" aria-hidden="true" />
              <span id="dlCancelLabel">{t('dlCancelLabel')}</span>
            </Button>
          ) : (
            <Button
              ref={actionButtonRef}
              type="button"
              variant="default"
              size="sm"
              data-testid="download-dismiss-btn"
              onClick={dismissDownload}
              className="min-w-28"
            >
              <span>{t('txtModalClose')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
