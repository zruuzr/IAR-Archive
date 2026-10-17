import {
  ArrowUpRight,
  Asterisk,
  CircleDot,
  Command,
  GitBranch,
  Layers,
  X
} from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';

export interface CoverZoomDialogProps {
  book: Book | null;
  onClose: () => void;
  onOpenDetails?: (book: Book) => void;
}

const ZOOM_TONE_CLASSES: readonly string[] = [
  'bg-gradient-to-br from-[#F4ECE0] via-[#E9DEC8] to-[#DECBA9] text-[#2B2114] border-[#C9B38C] dark:from-[#1B2232] dark:via-[#151B28] dark:to-[#101520] dark:text-[#ECE6D8] dark:border-[#2E384D]',
  'bg-gradient-to-br from-[#E7F0EE] via-[#D6E5E2] to-[#BBD3CE] text-[#142D2B] border-[#9ABBB5] dark:from-[#132629] dark:via-[#102023] dark:to-[#0C181B] dark:text-[#DDECEB] dark:border-[#244447]',
  'bg-gradient-to-br from-[#EFEAE2] via-[#E2D9CB] to-[#CFC2AE] text-[#231F1A] border-[#B8A88F] dark:from-[#201E29] dark:via-[#181720] dark:to-[#121118] dark:text-[#E8E2D8] dark:border-[#343144]',
  'bg-gradient-to-br from-[#F5EFE4] via-[#EAE0CE] to-[#D8C5A6] text-[#312312] border-[#C5AC84] dark:from-[#241E18] dark:via-[#1C1712] dark:to-[#14110D] dark:text-[#EFE4D2] dark:border-[#3D3326]',
  'bg-gradient-to-br from-[#EBF0F5] via-[#DCE4EE] to-[#C6D3E2] text-[#1A2533] border-[#A7B9CE] dark:from-[#16202E] dark:via-[#121A26] dark:to-[#0D131C] dark:text-[#E2E8F0] dark:border-[#29384D]'
] as const;

function ZoomCoverSymbol({ index }: { index: number }) {
  const iconClass = 'size-7 opacity-75';
  switch (index % 5) {
    case 0:
      return <Command className={iconClass} aria-hidden="true" />;
    case 1:
      return <GitBranch className={iconClass} aria-hidden="true" />;
    case 2:
      return <Layers className={iconClass} aria-hidden="true" />;
    case 3:
      return <Asterisk className={iconClass} aria-hidden="true" />;
    default:
      return <CircleDot className={iconClass} aria-hidden="true" />;
  }
}

/**
 * Accessible cover preview / zoom modal (#coverImageModal).
 * Displays the full cover image with object-contain (no distortion) or a
 * large designed editorial fallback when cover_image is empty or fails to load.
 */
export function CoverZoomDialog({ book, onClose, onOpenDetails }: CoverZoomDialogProps) {
  const { lang, t, getBookField } = useI18n();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const open = Boolean(book);

  const dialogRef = useAccessibleDialog<HTMLDivElement>({
    open,
    onEscape: onClose,
    initialFocusRef: closeButtonRef
  });

  if (!book) {
    return null;
  }

  const title = getBookField(book, 'title') || t('unknown');
  const author = getBookField(book, 'author') || t('unknown');
  const category = getCategoryLabel(book, lang) || t('generalCategory');
  const toneIndex = Math.abs(book.id) % 5;
  const showImage = Boolean(book.cover_image && failedUrl !== book.cover_image);

  return (
    <div
      id="coverImageModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="cover-zoom-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
              {category}
              {book.year ? ` · ${book.year}` : ''}
            </p>
            <h2
              id={titleId}
              data-testid="cover-zoom-title"
              className="mt-0.5 line-clamp-2 text-sm sm:text-base font-bold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{author}</p>
          </div>

          <Button
            ref={closeButtonRef}
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t('txtModalClose')}
            data-testid="cover-zoom-close-btn"
            className="shrink-0"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Cover Stage */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-secondary/25 p-5 sm:p-7">
          {showImage ? (
            <img
              id="coverModalImg"
              src={book.cover_image}
              alt={title}
              data-testid="cover-zoom-img"
              onError={() => setFailedUrl(book.cover_image)}
              className="max-h-[66vh] w-auto max-w-full rounded-lg border border-border object-contain shadow-lg"
            />
          ) : (
            <div
              data-testid="cover-zoom-fallback"
              className={cn(
                'flex aspect-[3/4] w-64 sm:w-72 max-w-full flex-col justify-between rounded-xl border p-6 text-start shadow-lg select-none',
                ZOOM_TONE_CLASSES[toneIndex]
              )}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider opacity-80">
                <span className="truncate">IAR / {book.year || 'ARCHIVE'}</span>
                <ZoomCoverSymbol index={toneIndex} />
              </div>

              <div className="my-auto space-y-2">
                <p className="line-clamp-5 text-lg sm:text-xl font-bold leading-snug tracking-tight">
                  {title}
                </p>
                <p className="line-clamp-2 text-xs font-medium opacity-80">{author}</p>
              </div>

              <div className="flex items-center justify-between border-t border-current/20 pt-2.5 text-[11px] font-mono uppercase tracking-widest opacity-70">
                <span>IAR ARCHIVE</span>
                <span>#{book.id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
          {onOpenDetails ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onOpenDetails(book);
              }}
              data-testid="cover-zoom-open-details-btn"
              className="gap-1.5"
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <span>{lang === 'ar' ? 'فتح صفحة المرجع' : 'Open reference page'}</span>
            </Button>
          ) : (
            <span />
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="cover-zoom-footer-close-btn"
          >
            {t('txtModalClose')}
          </Button>
        </div>
      </div>
    </div>
  );
}
