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
 * Matches the official sovereign card design with archival registration numbers,
 * verified status badge, tactile cover spine, interactive ratings, and official actions.
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

  const isCompact = viewMode === 'list';

  return (
    <article
      data-testid={`book-card-${book.id}`}
      data-book-id={book.id}
      className={cn(
        'book-card group relative bg-white dark:bg-card rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-border doc-shadow hover:border-gold-500/70 transition-all duration-300 flex flex-col md:flex-row gap-5 md:gap-6 items-start',
        isCompact && 'p-4 gap-4'
      )}
    >
      {/* Visual Sovereign Thumbnail / Document Cover */}
      <div className="shrink-0 mx-auto md:mx-0">
        <BookCover
          book={book}
          onClick={() => (onZoomCover ?? onOpenDetails)(book)}
          className={cn(
            'w-28 sm:w-32 h-40 sm:h-44 shadow-md transition-transform group-hover:scale-[1.02] border-r-4 border-gold-500 rounded-xl overflow-hidden',
            isCompact && 'w-20 h-28'
          )}
        />
      </div>

      {/* Main Metadata & Body */}
      <div className="flex-1 min-w-0 space-y-2.5 w-full">
        {/* Top Badges Ribbon */}
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
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                • {bookType}
              </span>
            )}
          </div>

          {/* Research Bundle Toggle Button */}
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
        </div>

        {/* Document Title */}
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

        {/* Author / Issuer & Bibliographic Meta */}
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

          {/* Interactive Star Rating */}
          <div className="inline-flex items-center">
            <RatingStars book={book} onRate={onRate} size="sm" />
          </div>
        </div>

        {/* Excerpt / Description */}
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
            {description}
          </p>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 dark:border-border/70 text-xs gap-2">
          {/* Main Reading & Download Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!hasFile}
              data-testid={`book-read-btn-${book.id}`}
              aria-label={t('read')}
              onClick={() => onRead(book)}
              className="bg-regal-800 hover:bg-regal-700 text-white font-bold h-8 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-sm text-xs cursor-pointer"
            >
              <BookOpen className="size-3.5 text-gold-400 shrink-0" aria-hidden="true" />
              <span>
                {translate('مطالعة المرجع في المتصفح', 'Read Reference in Browser')}
              </span>
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

          {/* Secondary Utility Actions */}
          <div className="flex items-center gap-2 text-slate-400 text-xs">
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
              <span>{translate('توثيق APA الأكاديمي', 'APA Academic Citation')}</span>
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

            <button
              type="button"
              data-testid={`book-favorite-btn-${book.id}`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
              title={isFavorite ? t('removeFavorite') : t('addFavorite')}
              onClick={() => onToggleFavorite(book.id)}
              className={cn(
                'p-1 text-slate-400 hover:text-destructive transition-colors cursor-pointer ms-1',
                isFavorite && 'text-destructive'
              )}
            >
              <Heart
                className={cn('size-3.5', isFavorite && 'fill-current text-destructive')}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
