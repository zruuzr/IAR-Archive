import { BookOpen, Check, Download, Layers, Quote, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  HeritageBookCard,
  HeritageButton,
  HeritageFavButton
} from '@/components/heritage';
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
 * Built using the Heritage presentation layer (`HeritageBookCard`),
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

  const cover = (
    <div
      className={cn(
        'flex justify-center shrink-0',
        viewMode === 'grid' ? 'mb-3.5' : 'mb-0'
      )}
    >
      <BookCover
        book={book}
        onClick={() => (onZoomCover ?? onOpenDetails)(book)}
        className="cursor-pointer shadow-sm hover:scale-[1.02] transition-transform duration-200"
      />
    </div>
  );

  const titleNode = (
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
  );

  const authorNode = author ? (
    <span data-testid={`book-author-${book.id}`}>{author}</span>
  ) : null;

  const meta = [
    category,
    book.year && book.year !== '0' ? book.year : null,
    book.pages && book.pages !== '0'
      ? `${formatNumber(Number(book.pages))} ${t('pagesUnit')}`
      : null,
    bookType ? bookType : null
  ].filter(Boolean);

  const ratingNode = <RatingStars book={book} onRate={onRate} size="sm" />;

  const actions = (
    <div className="flex flex-col gap-2 w-full pt-1">
      {/* Tier 1: Primary Read & Download */}
      <div className="flex items-center gap-2 w-full">
        <HeritageButton
          variant="solid"
          size="sm"
          disabled={!hasFile}
          data-testid={`book-read-btn-${book.id}`}
          aria-label={t('read')}
          onClick={() => onRead(book)}
          className="flex-1 justify-center min-w-0"
        >
          <BookOpen
            className="size-3.5 shrink-0 inline-block me-1.5"
            aria-hidden="true"
          />
          <span>{translate('مطالعة', 'Read')}</span>
        </HeritageButton>

        <HeritageButton
          variant="line"
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
          className="flex-1 justify-center min-w-0"
        >
          <Download
            className="size-3.5 shrink-0 inline-block me-1 text-warning"
            aria-hidden="true"
          />
          <span>PDF</span>
          {book.downloadCount > 0 && (
            <span
              data-download-count={book.id}
              className="ms-1 font-mono text-[10px] tabular-nums"
            >
              {formatNumber(book.downloadCount)}
            </span>
          )}
        </HeritageButton>
      </div>

      {/* Tier 2: Research Bundle & Utility Actions */}
      <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-[var(--hx-line)]/50">
        <HeritageButton
          variant="line"
          size="sm"
          data-testid={`book-bundle-btn-${book.id}`}
          aria-pressed={isInBundle}
          aria-label={`${t('addToBundlePrefix')}${title}`}
          title={
            isInBundle
              ? translate('إزالة من الحزمة', 'Remove from bundle')
              : translate('إضافة إلى حزمة البحث', 'Add to research bundle')
          }
          onClick={() => onToggleBundle(book.id)}
          className={cn('text-xs px-2 py-1 h-7 min-h-0', isInBundle && 'hx-is-active')}
        >
          <Layers className="size-3 shrink-0 inline-block me-1" aria-hidden="true" />
          <span className="text-[11px]">{t('bundleCheckboxLabel')}</span>
        </HeritageButton>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            data-testid={`book-cite-btn-${book.id}`}
            aria-label={t('cite')}
            title={translate('نسخ التوثيق الأكاديمي APA', 'Copy APA Academic Citation')}
            onClick={handleCiteClick}
            className={cn(
              'p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer',
              citedRecently && 'text-primary font-semibold'
            )}
          >
            {citedRecently ? (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <Quote className="size-3.5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid={`book-summary-btn-${book.id}`}
            aria-label={t('summary')}
            title={translate('ملخص ذكي للمرجع', '3-min AI Summary')}
            onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="size-3.5 text-warning" aria-hidden="true" />
          </button>

          {onShare && (
            <button
              type="button"
              data-testid={`book-share-btn-${book.id}`}
              aria-label={t('share')}
              title={t('share')}
              onClick={() => onShare(book)}
              className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Share2 className="size-3.5" aria-hidden="true" />
            </button>
          )}

          <HeritageFavButton
            pressed={isFavorite}
            onToggle={() => onToggleFavorite(book.id)}
            labelOn={t('removeFavorite')}
            labelOff={t('addFavorite')}
            data-testid={`book-favorite-btn-${book.id}`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <HeritageBookCard
      testId={`book-card-${book.id}`}
      data-book-id={book.id}
      data-cloth={cloth}
      cover={cover}
      title={titleNode}
      author={authorNode}
      meta={meta}
      rating={ratingNode}
      description={description}
      actions={actions}
      className={viewMode === 'list' ? 'hx-card-list' : undefined}
    />
  );
}
