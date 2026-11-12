import { useId, useRef, useState } from 'react';
import { HeritageBookCover, pickCloth } from '@/components/heritage';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';

export interface CoverZoomDialogProps {
  book: Book | null;
  onClose: () => void;
  onOpenDetails?: (book: Book) => void;
}

/**
 * Heritage Cover Lightbox (#coverImageModal).
 * Matches the v2 `.hx-zoom` nocturnal lapis & gold-bordered modal frame
 * with a clean full-height cover image (or 5:7 `HeritageBookCover` fallback)
 * and a centered ghost Close button.
 */
export function CoverZoomDialog({
  book,
  onClose,
  onOpenDetails: _onOpenDetails
}: CoverZoomDialogProps) {
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
  const category = getCategoryLabel(book, lang) || t('generalCategory');
  const showImage = Boolean(book.cover_image && failedUrl !== book.cover_image);

  return (
    <div
      id="coverImageModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="cover-zoom-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040a1c]/80 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="hx-zoom w-auto outline-none">
        <h2 id={titleId} data-testid="cover-zoom-title" className="hx-sr">
          {title}
        </h2>

        {showImage ? (
          <img
            id="coverModalImg"
            key={book.id}
            src={book.cover_image}
            alt={title}
            data-testid="cover-zoom-img"
            onError={() => setFailedUrl(book.cover_image)}
          />
        ) : (
          <div
            data-testid="cover-zoom-fallback"
            className="mx-auto mb-3.5 w-64 sm:w-72 max-w-full"
          >
            <HeritageBookCover
              title={title}
              category={category}
              year={book.year && book.year !== '0' ? book.year : '2026'}
              cloth={pickCloth(book.id)}
              titleAs="span"
              decorative
            />
          </div>
        )}

        <div className="flex justify-center">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            data-testid="cover-zoom-close-btn"
            className="hx-btn hx-btn-ghost"
          >
            {t('txtModalClose')}
          </button>
        </div>
      </div>
    </div>
  );
}
