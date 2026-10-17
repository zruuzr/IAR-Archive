import { AlertCircle, ExternalLink, FileText, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibleDialog } from '@/hooks/useAccessibleDialog';
import { useI18n } from '@/i18n/I18nProvider';
import { resolveAssetUrl } from '@/services/catalog';
import type { Book } from '@/types/book';

export const DEFAULT_PDFJS_VIEWER_URL =
  'https://mozilla.github.io/pdf.js/web/viewer.html';

export interface BuildPdfViewerUrlOptions {
  baseHref?: string;
  viewerBaseUrl?: string;
}

/**
 * Resolves a book's `file_path` and strictly verifies that the resulting URL uses
 * `http:` or `https:` without embedded credentials.
 *
 * Preserves the GitHub Raw conversion defined in `src/services/catalog.ts` while
 * blocking `file:`, `javascript:`, `data:`, or malformed URLs from entering an iframe.
 */
/* eslint-disable-next-line react-refresh/only-export-components */
export function resolveSafePdfUrl(filePath: unknown, baseHref?: string): string | null {
  const resolved = resolveAssetUrl(filePath, true, baseHref);
  if (!resolved) return null;

  try {
    const parsed = new URL(resolved);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Constructs the Mozilla PDF.js viewer URL for a given book `file_path`,
 * matching `readBook(book)` in `js/render.js`:
 * `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(absoluteUrl)}`
 *
 * Returns `null` if the file path is empty or unsafe.
 */
/* eslint-disable-next-line react-refresh/only-export-components */
export function buildPdfViewerUrl(
  filePath: unknown,
  options: BuildPdfViewerUrlOptions = {}
): string | null {
  const { baseHref, viewerBaseUrl = DEFAULT_PDFJS_VIEWER_URL } = options;
  const safePdfUrl = resolveSafePdfUrl(filePath, baseHref);
  if (!safePdfUrl) return null;

  try {
    const viewerCheck = new URL(viewerBaseUrl, 'https://mozilla.github.io');
    if (viewerCheck.protocol !== 'http:' && viewerCheck.protocol !== 'https:') {
      return null;
    }
  } catch {
    return null;
  }

  const separator = viewerBaseUrl.includes('?') ? '&' : '?';
  return `${viewerBaseUrl}${separator}file=${encodeURIComponent(safePdfUrl)}`;
}

export interface PdfReaderDialogProps {
  book: Pick<Book, 'id' | 'title' | 'title_en' | 'file_path'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerBaseUrl?: string;
  baseHref?: string;
}

/**
 * Accessible PDF.js reader modal dialog component.
 *
 * - Opens the book's `file_path` via Mozilla PDF.js viewer (preserving GitHub Raw resolution).
 * - Blocks unsafe protocols and handles missing or failed PDF URLs with a clear alert state.
 * - Supports closing via `Escape` key, backdrop click, or close button, with focus trapping and focus restoration.
 * - Cleans up iframe source (`about:blank`) and restores body scroll when closed or unmounted.
 */
export function PdfReaderDialog({
  book,
  open,
  onOpenChange,
  viewerBaseUrl = DEFAULT_PDFJS_VIEWER_URL,
  baseHref
}: PdfReaderDialogProps) {
  const { lang, dir, t, translate } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [failedViewerUrl, setFailedViewerUrl] = useState<string | null>(null);

  const isDialogOpen = Boolean(open && book);
  const dialogContainerRef = useAccessibleDialog<HTMLDivElement>({
    open: isDialogOpen,
    onEscape: () => onOpenChange(false),
    initialFocusRef: closeButtonRef
  });

  const safePdfUrl =
    isDialogOpen && book ? resolveSafePdfUrl(book.file_path, baseHref) : null;
  const viewerUrl =
    isDialogOpen && book
      ? buildPdfViewerUrl(book.file_path, { baseHref, viewerBaseUrl })
      : null;

  const hasFrameError = viewerUrl !== null && failedViewerUrl === viewerUrl;

  const bookTitle = book
    ? lang === 'en' && book.title_en
      ? book.title_en
      : book.title
    : '';

  if (!isDialogOpen || !book) {
    return null;
  }

  return (
    <div
      id="pdfReaderModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalBookTitle"
      dir={dir}
      data-testid="pdf-reader-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs"
    >
      {/* Backdrop click target */}
      <div
        data-testid="pdf-reader-backdrop"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0"
      />

      <div
        ref={dialogContainerRef}
        className="relative z-10 flex flex-col w-full max-w-6xl h-[92dvh] rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden"
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="size-4 text-primary shrink-0" aria-hidden="true" />
            <h2
              id="modalBookTitle"
              data-testid="pdf-reader-title"
              className="font-semibold text-sm sm:text-base truncate"
            >
              {bookTitle || translate('قارئ الملفات', 'PDF Reader')}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {safePdfUrl && (
              <a
                href={safePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="pdf-reader-direct-link"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-background text-xs font-medium hover:bg-accent transition-colors"
              >
                <span>{translate('فتح مباشر', 'Open direct')}</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}

            <Button
              ref={closeButtonRef}
              type="button"
              id="pdfDismissBtn"
              variant="ghost"
              size="icon"
              data-testid="pdf-reader-close"
              aria-label={t('txtModalClose')}
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="relative flex-1 bg-muted/40 flex flex-col">
          {!viewerUrl || hasFrameError ? (
            <div
              role="alert"
              data-testid="pdf-reader-error"
              className="m-auto max-w-md p-6 text-center space-y-3"
            >
              <div className="mx-auto size-12 rounded-full bg-destructive/15 text-destructive flex items-center justify-center">
                <AlertCircle className="size-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-base">{t('fileUnavailable')}</h3>
              <p className="text-xs text-muted-foreground">
                {translate(
                  'تعذّر فتح عارض PDF لهذا المرجع. تأكد من صحة رابط الملف أو افتحه مباشرة.',
                  'Could not open the PDF viewer for this reference. Verify the file link or open it directly.'
                )}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {hasFrameError && viewerUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid="pdf-reader-retry"
                    onClick={() => setFailedViewerUrl(null)}
                  >
                    {t('retry')}
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
                  {t('txtModalClose')}
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              id="pdfFrame"
              data-testid="pdf-reader-iframe"
              src={viewerUrl}
              title={translate('قارئ الملفات', 'PDF Reader')}
              onError={() => setFailedViewerUrl(viewerUrl)}
              className="w-full h-full border-0 flex-1"
              allow="fullscreen"
            />
          )}
        </div>
      </div>
    </div>
  );
}
