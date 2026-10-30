import { ArrowUpRight, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import {
  classifyShelfDiscipline,
  DisciplineOrnament,
  getBookCloth
} from '@/lib/editorial-cloth';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';

export interface CoverZoomDialogProps {
  book: Book | null;
  onClose: () => void;
  onOpenDetails?: (book: Book) => void;
}

/**
 * Accessible cover preview / zoom modal (#coverImageModal).
 * Displays the full cover image with object-contain on an editorial cotton-rag stage,
 * or a large cloth-bound monograph cover fallback when `cover_image` is empty or fails to load.
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
  const cloth = getBookCloth(book.id);
  const discipline = classifyShelfDiscipline(book);
  const showImage = Boolean(book.cover_image && failedUrl !== book.cover_image);

  return (
    <div
      id="coverImageModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="cover-zoom-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[6px] border hairline-border-strong bg-card text-card-foreground shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b hairline-border bg-background/60 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
              IAR-{String(book.id).padStart(3, '0')} · {category}
              {book.year && book.year !== '0' ? ` · ${book.year}` : ''}
            </p>
            <h2
              id={titleId}
              data-testid="cover-zoom-title"
              className="mt-0.5 line-clamp-2 font-serif text-base sm:text-lg font-bold text-foreground"
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
        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-secondary/45 p-6 sm:p-8">
          {showImage ? (
            <img
              id="coverModalImg"
              src={book.cover_image}
              alt={title}
              data-testid="cover-zoom-img"
              onError={() => setFailedUrl(book.cover_image)}
              className="max-h-[66vh] w-auto max-w-full rounded-[4px] border hairline-border-strong object-contain shadow-xl"
            />
          ) : (
            <div
              data-cloth={cloth}
              data-testid="cover-zoom-fallback"
              className="cloth-weave flex aspect-[3/4] w-64 sm:w-72 max-w-full flex-col justify-between rounded-[4px] p-6 text-start shadow-xl select-none"
            >
              <div
                className="flex items-center justify-between gap-2 border-b pb-2.5 font-mono text-xs uppercase tracking-widest"
                style={{
                  color: 'var(--cloth-muted)',
                  borderColor: 'var(--cloth-rule)'
                }}
              >
                <span className="truncate">IAR ARCHIVE</span>
                <span>NO. {String(book.id).padStart(2, '0')}</span>
              </div>

              <div
                className="my-4 flex flex-1 items-center justify-center border bg-black/[0.06]"
                style={{
                  borderColor: 'var(--cloth-rule)',
                  color: 'var(--cloth-accent)'
                }}
              >
                <DisciplineOrnament discipline={discipline} className="size-24" />
              </div>

              <div className="space-y-1.5">
                <span
                  className="block text-xs font-semibold"
                  style={{ color: 'var(--cloth-accent)' }}
                >
                  {category}
                </span>
                <p className="line-clamp-4 font-serif text-lg sm:text-xl font-bold leading-snug">
                  {title}
                </p>
              </div>

              <div
                className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11px]"
                style={{
                  color: 'var(--cloth-muted)',
                  borderColor: 'var(--cloth-rule)'
                }}
              >
                <span className="truncate">{author}</span>
                <span className="font-mono">{book.year || '2026'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t hairline-border bg-background/60 px-4 py-3 sm:px-5">
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
