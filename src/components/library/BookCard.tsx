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
 * Sovereign Archival Reference Card (Concept 1: البوابة السيادية الوطنية).
 * Dynamically styled for both harmonious vertical grid display (compact, balanced proportions)
 * and horizontal list view, preserving all archival registrations, verified status,
 * rating stars, and one-click sovereign tools.
 * Responsive: Perfectly adapted for mobile horizontal density and desktop vertical balance.
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

  const handleCiteClick = () => {
    onCopyCitation(book);
    setCitedRecently(true);
    setTimeout(() => {
      setCitedRecently(false);
    }, 1800);
  };

  const isList = viewMode === 'list';

  // -------------------------------------------------------------
  // LIST VIEW: Horizontal institutional row
  // -------------------------------------------------------------
  if (isList) {
    return (
      <article
        data-testid={`book-card-${book.id}`}
        data-book-id={book.id}
        className="book-card group relative bg-white dark:bg-card rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-border doc-shadow hover:border-gold-500/70 hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center"
      >
        {/* Cover thumbnail */}
        <div className="shrink-0 mx-auto sm:mx-0">
          <BookCover
            book={book}
            onClick={() => (onZoomCover ?? onOpenDetails)(book)}
            className="w-20 sm:w-24 h-28 sm:h-34 shadow-md transition-transform group-hover:scale-[1.02] border-r-3 border-gold-500 rounded-xl overflow-hidden cursor-pointer"
          />
        </div>

        {/* List Content */}
        <div className="flex-1 min-w-0 space-y-2 w-full">
          {/* Badges row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-regal-100 text-regal-900 dark:bg-regal-900/60 dark:text-gold-300 text-[11px] font-black border border-regal-200 dark:border-regal-800">
                {category}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                {translate('رمز المرجع:', 'Ref ID:')} IAR-ADM-
                {book.id.toString().padStart(3, '0')}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-bold inline-flex items-center gap-1">
                <span>✓</span>
                <span>{translate('مرجع إداري موثق', 'Verified Reference')}</span>
              </span>
              {bookType && (
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  • {bookType}
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
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-ring',
                  isInBundle
                    ? 'border-gold-500 bg-gold-500/15 text-gold-600 dark:text-gold-400 font-semibold'
                    : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:border-gold-500/50 hover:text-slate-800 dark:hover:text-slate-200'
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
                  'p-1 text-slate-400 hover:text-destructive transition-colors cursor-pointer',
                  isFavorite && 'text-destructive'
                )}
              >
                <Heart
                  className={cn(
                    'size-3.5',
                    isFavorite && 'fill-current text-destructive'
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-regal-800 dark:group-hover:text-gold-400 transition-colors cursor-pointer leading-snug">
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
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {author && (
              <span
                data-testid={`book-author-${book.id}`}
                className="font-medium text-slate-700 dark:text-slate-300"
              >
                {author}
              </span>
            )}
            {book.year && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="size-3 text-gold-500 shrink-0" aria-hidden="true" />
                <span>{book.year}</span>
              </span>
            )}
            {book.pages && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <FileText
                  className="size-3 text-regal-600 dark:text-regal-400 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {book.pages} {t('pagesUnit')}
                </span>
              </span>
            )}
            <RatingStars book={book} onRate={onRate} size="sm" />
          </div>

          {description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}

          {/* List Toolbar */}
          <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-100 dark:border-border/70 text-xs gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={!hasFile}
                data-testid={`book-read-btn-${book.id}`}
                aria-label={t('read')}
                onClick={() => onRead(book)}
                className="bg-regal-800 hover:bg-regal-700 text-white font-bold h-8 px-3 rounded-xl transition flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
              >
                <BookOpen
                  className="size-3.5 text-gold-400 shrink-0"
                  aria-hidden="true"
                />
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
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 h-8 px-3 rounded-xl transition flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Download
                  className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0"
                  aria-hidden="true"
                />
                <span>{translate('تحميل PDF', 'Download PDF')}</span>
                {book.file_size && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    ({book.file_size})
                  </span>
                )}
                {book.downloadCount > 0 && (
                  <span
                    data-download-count={book.id}
                    className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 text-[10px] tabular-nums"
                  >
                    {formatNumber(book.downloadCount)}
                  </span>
                )}
              </Button>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <button
                type="button"
                data-testid={`book-cite-btn-${book.id}`}
                aria-label={t('cite')}
                title={t('cite')}
                onClick={handleCiteClick}
                className={cn(
                  'hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer',
                  citedRecently && 'text-gold-600 dark:text-gold-400 font-bold'
                )}
              >
                {citedRecently ? (
                  <Check className="size-3 text-gold-500" aria-hidden="true" />
                ) : (
                  <Quote className="size-3" aria-hidden="true" />
                )}
                <span>{translate('توثيق APA الأكاديمي', 'APA Citation')}</span>
              </button>

              <span>•</span>

              <button
                type="button"
                data-testid={`book-summary-btn-${book.id}`}
                aria-label={t('summary')}
                title={t('summary')}
                onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
                className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3 text-gold-500" aria-hidden="true" />
                <span>{translate('ملخص ذكي', 'Summary')}</span>
              </button>

              {onShare && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    data-testid={`book-share-btn-${book.id}`}
                    aria-label={t('share')}
                    title={t('share')}
                    onClick={() => onShare(book)}
                    className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
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
  // GRID VIEW: Mathematically balanced, responsive sovereign book card
  // (Horizontal on mobile <sm, Vertical on tablet/desktop >=sm)
  // -------------------------------------------------------------
  return (
    <article
      data-testid={`book-card-${book.id}`}
      data-book-id={book.id}
      className="book-card group relative bg-white dark:bg-card rounded-2xl p-3.5 sm:p-5 border border-slate-200 dark:border-border doc-shadow hover:border-gold-500/70 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full"
    >
      {/* Top Body Section: Horizontal row on mobile, Vertical column on tablet/desktop */}
      <div className="flex flex-row sm:flex-col gap-3.5 sm:gap-0 items-start sm:items-stretch">
        {/* Book Cover Presentation */}
        <div className="shrink-0 sm:mx-auto sm:mb-3">
          <BookCover
            book={book}
            onClick={() => (onZoomCover ?? onOpenDetails)(book)}
            className="w-22 h-32 sm:w-28 sm:h-40 md:w-32 md:h-44 shadow-md transition-transform duration-300 group-hover:scale-[1.03] border-r-3 sm:border-r-4 border-gold-500 rounded-xl overflow-hidden cursor-pointer"
          />
        </div>

        {/* Book Metadata & Title Body */}
        <div className="flex-1 min-w-0 sm:text-center space-y-1 sm:space-y-1.5">
          {/* Header Strip: Category Pill + Ref ID + Favorite/Bundle Actions */}
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-3.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                title={category}
                className="px-2 py-0.5 rounded-full bg-regal-100 text-regal-900 dark:bg-regal-900/60 dark:text-gold-300 text-[10px] sm:text-[11px] font-black border border-regal-200 dark:border-regal-800 truncate max-w-[130px] sm:max-w-[145px]"
              >
                {category}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                IAR-{book.id.toString().padStart(3, '0')}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Research Bundle Toggle Button */}
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
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                  isInBundle
                    ? 'border-gold-500 bg-gold-500/15 text-gold-600 dark:text-gold-400 font-semibold'
                    : 'border-slate-200 dark:border-border bg-slate-50 dark:bg-slate-800/80 text-slate-500 hover:border-gold-500/50 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Layers className="size-2.5 shrink-0" aria-hidden="true" />
                <span className="hidden md:inline">{t('bundleCheckboxLabel')}</span>
              </button>

              {/* Favorite Button */}
              <button
                type="button"
                data-testid={`book-favorite-btn-${book.id}`}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
                title={isFavorite ? t('removeFavorite') : t('addFavorite')}
                onClick={() => onToggleFavorite(book.id)}
                className={cn(
                  'p-1 rounded-md text-slate-400 hover:text-destructive hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer',
                  isFavorite && 'text-destructive bg-destructive/10'
                )}
              >
                <Heart
                  className={cn(
                    'size-3.5',
                    isFavorite && 'fill-current text-destructive'
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* Document Title */}
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-regal-800 dark:group-hover:text-gold-400 transition-colors line-clamp-2 leading-snug sm:min-h-[2.5rem] sm:flex sm:items-center sm:justify-center">
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
              className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate"
            >
              {author}
            </p>
          )}

          {/* Meta Chips Row (Year, Pages, Verified) */}
          <div className="flex flex-wrap items-center sm:justify-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {book.year && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="size-3 text-gold-500 shrink-0" aria-hidden="true" />
                <span>{book.year}</span>
              </span>
            )}

            {book.pages && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <FileText
                  className="size-3 text-regal-600 dark:text-regal-400 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  {book.pages} {t('pagesUnit')}
                </span>
              </span>
            )}

            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-bold inline-flex items-center gap-0.5">
              <span>✓</span>
              <span>{translate('موثق', 'Verified')}</span>
            </span>
          </div>

          {/* Rating Stars */}
          <div className="flex sm:justify-center pt-0.5 sm:pt-1">
            <RatingStars book={book} onRate={onRate} size="sm" />
          </div>
        </div>
      </div>

      {/* Action Toolbar: Compact 2-tier footer */}
      <div className="mt-3 sm:mt-3.5 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-border/70 space-y-2">
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
            className="flex-1 bg-regal-900 hover:bg-regal-800 dark:bg-regal-800 dark:hover:bg-regal-700 text-white font-bold h-8 px-2 rounded-xl transition flex items-center justify-center gap-1 shadow-2xs text-xs cursor-pointer"
          >
            <BookOpen className="size-3.5 text-gold-400 shrink-0" aria-hidden="true" />
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
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 h-8 px-2.5 rounded-xl transition flex items-center justify-center gap-1 text-xs cursor-pointer shrink-0"
          >
            <Download
              className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0"
              aria-hidden="true"
            />
            <span>PDF</span>
            {book.downloadCount > 0 && (
              <span
                data-download-count={book.id}
                className="rounded-full bg-slate-200 dark:bg-slate-700 px-1 text-[9px] tabular-nums"
              >
                {formatNumber(book.downloadCount)}
              </span>
            )}
          </Button>
        </div>

        {/* Secondary Utility Row (APA citation, Summary, Share) */}
        <div className="flex items-center justify-around text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <button
            type="button"
            data-testid={`book-cite-btn-${book.id}`}
            aria-label={t('cite')}
            title={translate('نسخ التوثيق الأكاديمي APA', 'Copy APA Academic Citation')}
            onClick={handleCiteClick}
            className={cn(
              'hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer py-0.5',
              citedRecently && 'text-gold-600 dark:text-gold-400 font-bold'
            )}
          >
            {citedRecently ? (
              <Check className="size-3 text-gold-500" aria-hidden="true" />
            ) : (
              <Quote className="size-3" aria-hidden="true" />
            )}
            <span>{translate('توثيق APA', 'APA')}</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          <button
            type="button"
            data-testid={`book-summary-btn-${book.id}`}
            aria-label={t('summary')}
            title={translate('ملخص ذكي للمرجع', '3-min AI Summary')}
            onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
            className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer py-0.5"
          >
            <Sparkles className="size-3 text-gold-500" aria-hidden="true" />
            <span>{translate('ملخص ذكي', 'Summary')}</span>
          </button>

          {onShare && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                data-testid={`book-share-btn-${book.id}`}
                aria-label={t('share')}
                title={t('share')}
                onClick={() => onShare(book)}
                className="hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer py-0.5"
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
