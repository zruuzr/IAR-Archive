import {
  BookOpen,
  Calendar,
  Check,
  Download,
  FileText,
  Heart,
  Layers,
  Quote,
  Share2,
  Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { buildBookUrl } from '@/hooks/useBundle';
import type { ViewMode } from '@/hooks/useLibraryState';
import { useI18n } from '@/i18n/I18nProvider';
import { getBookCloth } from '@/lib/editorial-cloth';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface BookCardProps {
  book: Book;
  viewMode: ViewMode;
  isFavorite: boolean;
  isInBundle: boolean;
  isDownloadBusy?: boolean;
  onRead: (book: Book) => void;
  onDownload: (book: Book) => void;
  onToggleFavorite: (bookId: number) => void;
  onToggleBundle: (bookId: number) => void;
  onCopyCitation: (book: Book) => void;
  onOpenDetails: (book: Book) => void;
  onOpenSummary?: (book: Book) => void;
  onZoomCover?: (book: Book) => void;
  onShare?: (book: Book) => void;
  onRate?: (bookId: number, stars: number) => void;
}

/**
 * Editorial Archival Monograph Card for IAR ARCHIVE — المرجع الإداري العراقي.
 * Supports both Bibliographic Ledger List View and Cloth-Ribbed Monograph Grid View,
 * preserving all archival call numbers, interactive rating stars, and researcher actions.
 */
export function BookCard({
  book,
  viewMode,
  isFavorite,
  isInBundle,
  isDownloadBusy = false,
  onRead,
  onDownload,
  onToggleFavorite,
  onToggleBundle,
  onCopyCitation,
  onOpenDetails,
  onOpenSummary,
  onZoomCover,
  onShare,
  onRate
}: BookCardProps) {
  const { lang, t, translate, getBookField, formatNumber } = useI18n();
  const [citedRecently, setCitedRecently] = useState<boolean>(false);

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const category = getCategoryLabel(book, lang);
  const hasFile = Boolean(book.file_path);
  const cloth = getBookCloth(book.id);

  const handleCiteClick = () => {
    onCopyCitation(book);
    setCitedRecently(true);
    setTimeout(() => {
      setCitedRecently(false);
    }, 1800);
  };

  const isList = viewMode === 'list';

  // -------------------------------------------------------------
  // LIST VIEW: Swiss / Arabic Bibliographic Ledger Row
  // -------------------------------------------------------------
  if (isList) {
    return (
      <article
        data-testid={`book-card-${book.id}`}
        data-book-id={book.id}
        data-cloth={cloth}
        className="book-card group relative overflow-hidden bg-card rounded-[4px] p-4 sm:p-5 border hairline-border-strong doc-shadow hover:border-foreground/40 transition-colors flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center"
      >
        {/* Cloth pigment spine strip on start edge */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 start-0 w-[3px]"
          style={{ background: 'var(--cloth-bg)' }}
        />

        {/* Cover thumbnail inside cotton-rag mat */}
        <div className="shrink-0 mx-auto sm:mx-0 rounded-[3px] border hairline-border bg-secondary/45 p-2">
          <BookCover
            book={book}
            onClick={() => (onZoomCover ?? onOpenDetails)(book)}
            className="w-20 sm:w-22 h-28 sm:h-32 transition-transform duration-300 group-hover:scale-[1.02] cursor-pointer"
          />
        </div>

        {/* List Content */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          {/* Badges row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-[2px] bg-secondary text-secondary-foreground text-[11px] font-semibold border hairline-border">
                {category}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono tracking-wider">
                IAR-{book.id.toString().padStart(3, '0')}
              </span>
              {bookType && (
                <span className="text-[11px] text-muted-foreground hidden md:inline">
                  · {bookType}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid={`book-bundle-btn-${book.id}`}
                aria-pressed={isInBundle}
                aria-label={`${t('addToBundlePrefix')}${title}`}
                onClick={() => onToggleBundle(book.id)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-[3px] border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ring',
                  isInBundle
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'hairline-border bg-background/70 text-muted-foreground hover:border-foreground/35 hover:text-foreground'
                )}
              >
                <Layers className="size-3 shrink-0" aria-hidden="true" />
                <span>{t('bundleCheckboxLabel')}</span>
              </button>

              <button
                type="button"
                data-testid={`book-favorite-btn-${book.id}`}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
                title={isFavorite ? t('removeFavorite') : t('addFavorite')}
                onClick={() => onToggleFavorite(book.id)}
                className={cn(
                  'p-1 rounded-[2px] text-muted-foreground hover:text-primary transition-colors cursor-pointer',
                  isFavorite && 'text-primary'
                )}
              >
                <Heart
                  className={cn('size-3.5', isFavorite && 'fill-current text-primary')}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="book-title font-serif text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug">
            <a
              href={buildBookUrl(book.id)}
              data-testid={`book-title-link-${book.id}`}
              onClick={(e) => {
                e.preventDefault();
                onOpenDetails(book);
              }}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
            >
              {title}
            </a>
          </h3>

          {/* Author & Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {author && (
              <span
                data-testid={`book-author-${book.id}`}
                className="font-medium text-foreground/85"
              >
                {author}
              </span>
            )}
            {book.year && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="size-3 text-primary shrink-0" aria-hidden="true" />
                <span>{book.year}</span>
              </span>
            )}
            {book.pages && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <FileText className="size-3 text-teal shrink-0" aria-hidden="true" />
                <span>
                  {book.pages} {t('pagesUnit')}
                </span>
              </span>
            )}
            <RatingStars book={book} onRate={onRate} size="sm" />
          </div>

          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          )}

          {/* List Toolbar */}
          <div className="flex flex-wrap items-center justify-between pt-2.5 border-t hairline-border text-xs gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!hasFile}
                data-testid={`book-read-btn-${book.id}`}
                aria-label={t('read')}
                onClick={() => onRead(book)}
                className="bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-semibold h-8 px-3 rounded-[3px] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{translate('مطالعة المرجع', 'Read Reference')}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasFile || isDownloadBusy}
                data-testid={`book-download-btn-${book.id}`}
                aria-label={t('download')}
                onClick={() => onDownload(book)}
                className="bg-background/70 hover:bg-secondary text-foreground font-semibold border hairline-border-strong h-8 px-3 rounded-[3px] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Download className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>{translate('تحميل PDF', 'Download PDF')}</span>
                {book.file_size && (
                  <span className="text-[10px] text-muted-foreground font-mono font-normal">
                    ({book.file_size})
                  </span>
                )}
                {book.downloadCount > 0 && (
                  <span
                    data-download-count={book.id}
                    className="rounded-[2px] bg-secondary px-1.5 font-mono text-[10px] tabular-nums"
                  >
                    {formatNumber(book.downloadCount)}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <button
                type="button"
                data-testid={`book-cite-btn-${book.id}`}
                aria-label={t('cite')}
                title={t('cite')}
                onClick={handleCiteClick}
                className={cn(
                  'hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer',
                  citedRecently && 'text-primary font-semibold'
                )}
              >
                {citedRecently ? (
                  <Check className="size-3 text-primary" aria-hidden="true" />
                ) : (
                  <Quote className="size-3" aria-hidden="true" />
                )}
                <span>{translate('توثيق APA الأكاديمي', 'APA Citation')}</span>
              </button>

              <span className="opacity-40">·</span>

              <button
                type="button"
                data-testid={`book-summary-btn-${book.id}`}
                aria-label={t('summary')}
                title={t('summary')}
                onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
                className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3 text-primary" aria-hidden="true" />
                <span>{translate('ملخص ذكي', 'Summary')}</span>
              </button>

              {onShare && (
                <>
                  <span className="opacity-40">·</span>
                  <button
                    type="button"
                    data-testid={`book-share-btn-${book.id}`}
                    aria-label={t('share')}
                    title={t('share')}
                    onClick={() => onShare(book)}
                    className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // GRID VIEW: Editorial Archival Monograph Card
  // -------------------------------------------------------------
  return (
    <article
      data-testid={`book-card-${book.id}`}
      data-book-id={book.id}
      data-cloth={cloth}
      className="book-card group relative overflow-hidden bg-card rounded-[4px] p-3.5 sm:p-4.5 border hairline-border-strong doc-shadow hover:border-foreground/45 transition-all duration-300 flex flex-col justify-between h-full"
    >
      {/* Top 3px Authentic Book-Cloth Pigment Ribbon */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'var(--cloth-bg)' }}
      />

      {/* Top Body Section: Horizontal row on mobile, Vertical column on tablet/desktop */}
      <div className="flex flex-row sm:flex-col gap-3.5 sm:gap-0 items-start sm:items-stretch pt-1">
        {/* Header Strip on Desktop: Category + Call Number + Bundle/Favorite */}
        <div className="hidden sm:flex items-center justify-between gap-1 mb-3 pb-2 border-b hairline-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider shrink-0">
              IAR-{book.id.toString().padStart(3, '0')}
            </span>
            <span className="opacity-35">·</span>
            <span
              title={category}
              className="text-[11px] font-medium text-muted-foreground truncate max-w-[140px]"
            >
              {category}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-testid={`book-bundle-btn-${book.id}`}
              aria-pressed={isInBundle}
              aria-label={`${t('addToBundlePrefix')}${title}`}
              title={
                isInBundle
                  ? translate('إزالة من الحزمة', 'Remove from bundle')
                  : translate('إضافة إلى حزمة البحث', 'Add to research bundle')
              }
              onClick={() => onToggleBundle(book.id)}
              className={cn(
                'inline-flex items-center gap-1 rounded-[2px] border px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                isInBundle
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'hairline-border bg-background/70 text-muted-foreground hover:border-foreground/35 hover:text-foreground'
              )}
            >
              <Layers className="size-2.5 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">{t('bundleCheckboxLabel')}</span>
            </button>

            <button
              type="button"
              data-testid={`book-favorite-btn-${book.id}`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
              title={isFavorite ? t('removeFavorite') : t('addFavorite')}
              onClick={() => onToggleFavorite(book.id)}
              className={cn(
                'p-1 rounded-[2px] text-muted-foreground hover:text-primary hover:bg-secondary/70 transition-colors cursor-pointer',
                isFavorite && 'text-primary bg-primary/10'
              )}
            >
              <Heart
                className={cn('size-3.5', isFavorite && 'fill-current text-primary')}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Recessed Cotton-Rag Book Cover Pedestal */}
        <div className="shrink-0 sm:mb-3.5 sm:rounded-[3px] sm:border sm:hairline-border sm:bg-secondary/45 sm:py-4 sm:flex sm:justify-center">
          <BookCover
            book={book}
            onClick={() => (onZoomCover ?? onOpenDetails)(book)}
            className="w-22 h-32 sm:w-28 sm:h-40 md:w-30 md:h-42 transition-transform duration-300 group-hover:-translate-y-0.5 cursor-pointer"
          />
        </div>

        {/* Book Metadata & Title Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Mobile-only Header Strip */}
          <div className="flex sm:hidden items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                title={category}
                className="px-1.5 py-0.5 rounded-[2px] bg-secondary text-secondary-foreground text-[10px] font-medium border hairline-border truncate max-w-[125px]"
              >
                {category}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                IAR-{book.id.toString().padStart(3, '0')}
              </span>
            </div>
          </div>

          {/* Document Title (with .book-title for E2E & semantic clarity) */}
          <h3 className="book-title font-serif text-base sm:text-[1.12rem] font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug sm:min-h-[2.85rem]">
            <a
              href={buildBookUrl(book.id)}
              data-testid={`book-title-link-${book.id}`}
              onClick={(e) => {
                e.preventDefault();
                onOpenDetails(book);
              }}
              className="hover:underline focus-visible:outline-2 focus-visible:outline-ring rounded-xs"
            >
              {title}
            </a>
          </h3>

          {/* Author */}
          {author && (
            <p
              data-testid={`book-author-${book.id}`}
              className="text-xs text-muted-foreground font-medium truncate"
            >
              {author}
            </p>
          )}

          {/* Meta Row (Year, Pages) */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-muted-foreground font-mono tabular-nums">
            {book.year && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3 text-primary shrink-0" aria-hidden="true" />
                <span>{book.year}</span>
              </span>
            )}

            {book.pages && (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3 text-teal shrink-0" aria-hidden="true" />
                <span>
                  {book.pages} {t('pagesUnit')}
                </span>
              </span>
            )}
          </div>

          {/* Rating Stars */}
          <div className="flex pt-0.5">
            <RatingStars book={book} onRate={onRate} size="sm" />
          </div>
        </div>
      </div>

      {/* Action Toolbar: Crisp 2-tier editorial footer */}
      <div className="mt-3.5 pt-2.5 border-t hairline-border space-y-2">
        {/* Main Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!hasFile}
            data-testid={`book-read-btn-${book.id}`}
            aria-label={t('read')}
            onClick={() => onRead(book)}
            className="flex-1 bg-foreground text-background hover:bg-primary hover:text-primary-foreground font-semibold h-8 px-2.5 rounded-[3px] transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{translate('مطالعة المرجع', 'Read')}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasFile || isDownloadBusy}
            data-testid={`book-download-btn-${book.id}`}
            aria-label={t('download')}
            title={
              book.file_size
                ? `${translate('تحميل', 'Download')} (${book.file_size})`
                : t('download')
            }
            onClick={() => onDownload(book)}
            className="bg-background/70 hover:bg-secondary text-foreground font-semibold border hairline-border-strong h-8 px-2.5 rounded-[3px] transition-colors flex items-center justify-center gap-1 text-xs cursor-pointer shrink-0"
          >
            <Download className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span className="font-mono text-[11px]">PDF</span>
            {book.downloadCount > 0 && (
              <span
                data-download-count={book.id}
                className="rounded-[2px] bg-secondary px-1 font-mono text-[9.5px] tabular-nums"
              >
                {formatNumber(book.downloadCount)}
              </span>
            )}
          </Button>
        </div>

        {/* Secondary Utility Row (APA citation, Summary, Share) */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <button
            type="button"
            data-testid={`book-cite-btn-${book.id}`}
            aria-label={t('cite')}
            title={translate('نسخ التوثيق الأكاديمي APA', 'Copy APA Academic Citation')}
            onClick={handleCiteClick}
            className={cn(
              'hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer py-0.5',
              citedRecently && 'text-primary font-semibold'
            )}
          >
            {citedRecently ? (
              <Check className="size-3 text-primary" aria-hidden="true" />
            ) : (
              <Quote className="size-3" aria-hidden="true" />
            )}
            <span>{translate('توثيق APA', 'APA')}</span>
          </button>

          <span className="opacity-35">·</span>

          <button
            type="button"
            data-testid={`book-summary-btn-${book.id}`}
            aria-label={t('summary')}
            title={translate('ملخص ذكي للمرجع', '3-min AI Summary')}
            onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
            className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer py-0.5"
          >
            <Sparkles className="size-3 text-primary" aria-hidden="true" />
            <span>{translate('ملخص ذكي', 'Summary')}</span>
          </button>

          {onShare && (
            <>
              <span className="opacity-35">·</span>
              <button
                type="button"
                data-testid={`book-share-btn-${book.id}`}
                aria-label={t('share')}
                title={t('share')}
                onClick={() => onShare(book)}
                className="hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer py-0.5"
              >
                <Share2 className="size-3" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
