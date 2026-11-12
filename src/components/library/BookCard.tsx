import { useEffect, useRef, useState } from 'react';
import {
  HeritageBookCard,
  HeritageButton,
  HeritageFavButton,
  HeritageIcon,
  HeritageMenuItem,
  HeritageMoreMenu,
  HeritageStat,
  pickCloth
} from '@/components/heritage';
import { buildBookUrl } from '@/hooks/useBundle';
import type { ViewMode } from '@/hooks/useLibraryState';
import { useI18n } from '@/i18n/I18nProvider';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
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
 * Built on v2 `HeritageBookCard` with a single stretched title link, 5:7 cloth/image cover,
 * one primary Read button, favorite toggle, and `HeritageMoreMenu` for secondary researcher tools.
 */
export function BookCard({
  book,
  viewMode: _viewMode,
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
  const { lang, t, getBookField, formatNumber } = useI18n();
  const [citedRecently, setCitedRecently] = useState<boolean>(false);
  const citeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (citeTimerRef.current) {
        clearTimeout(citeTimerRef.current);
      }
    };
  }, []);

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const category = getCategoryLabel(book, lang);
  const hasFile = Boolean(book.file_path);

  const handleCiteClick = () => {
    onCopyCitation(book);
    setCitedRecently(true);
    if (citeTimerRef.current) {
      clearTimeout(citeTimerRef.current);
    }
    citeTimerRef.current = setTimeout(() => {
      setCitedRecently(false);
    }, 1800);
  };

  const meta = [
    book.year && book.year !== '0' ? book.year : null,
    book.pages && book.pages !== '0'
      ? `${formatNumber(Number(book.pages))} ${t('pagesUnit')}`
      : null,
    bookType || null
  ].filter(Boolean);

  const downloadLabel = book.file_size
    ? `${t('download')} (${book.file_size})`
    : t('download');

  return (
    <HeritageBookCard
      testId={`book-card-${book.id}`}
      title={title}
      href={buildBookUrl(book.id)}
      onOpen={() => onOpenDetails(book)}
      titleTestId={`book-title-link-${book.id}`}
      cover={{
        title,
        category: category ?? undefined,
        year: book.year && book.year !== '0' ? book.year : '2026',
        cloth: pickCloth(book.id),
        image: book.cover_image || undefined,
        loading: 'lazy',
        testIds: {
          image: `book-cover-img-${book.id}`,
          fallback: `book-cover-fallback-${book.id}`
        }
      }}
      kicker={category}
      author={
        author ? <span data-testid={`book-author-${book.id}`}>{author}</span> : null
      }
      meta={meta}
      excerpt={description}
      onZoomCover={onZoomCover ? () => onZoomCover(book) : undefined}
      zoomLabel={`${t('zoomCover')}: ${title}`}
      zoomTestId={`book-cover-btn-${book.id}`}
      stats={
        <>
          <RatingStars book={book} onRate={onRate} size="sm" />
          {book.downloadCount > 0 ? (
            <HeritageStat
              icon="download-count"
              value={
                <span data-download-count={book.id}>
                  {formatNumber(book.downloadCount)}
                </span>
              }
              label={`${formatNumber(book.downloadCount)} ${t('downloadsUnit')}`}
            />
          ) : null}
        </>
      }
      actions={
        <>
          <HeritageButton
            variant="solid"
            size="sm"
            disabled={!hasFile}
            data-testid={`book-read-btn-${book.id}`}
            aria-label={t('read')}
            onClick={() => onRead(book)}
          >
            <HeritageIcon name="read" size={16} />
            <span>{t('read')}</span>
          </HeritageButton>

          <HeritageFavButton
            pressed={isFavorite}
            onToggle={() => onToggleFavorite(book.id)}
            labelOn={t('removeFavorite')}
            labelOff={t('addFavorite')}
            data-testid={`book-favorite-btn-${book.id}`}
          />

          <HeritageMoreMenu label={t('moreActions')}>
            <HeritageMenuItem
              icon={<HeritageIcon name="download" size={16} />}
              disabled={!hasFile || isDownloadBusy}
              data-testid={`book-download-btn-${book.id}`}
              aria-label={downloadLabel}
              onClick={() => onDownload(book)}
            >
              {downloadLabel}
            </HeritageMenuItem>

            <HeritageMenuItem
              icon={<HeritageIcon name="bundle" size={16} />}
              pressed={isInBundle}
              data-testid={`book-bundle-btn-${book.id}`}
              aria-label={`${t('addToBundlePrefix')}${title}`}
              onClick={() => onToggleBundle(book.id)}
            >
              {isInBundle ? t('removeFromBundle') : t('bundleCheckboxLabel')}
            </HeritageMenuItem>

            <HeritageMenuItem
              icon={<HeritageIcon name={citedRecently ? 'check' : 'quote'} size={16} />}
              data-testid={`book-cite-btn-${book.id}`}
              onClick={handleCiteClick}
            >
              {citedRecently ? t('singleCopiedBtn') : t('cite')}
            </HeritageMenuItem>

            <HeritageMenuItem
              icon={<HeritageIcon name="summary" size={16} />}
              data-testid={`book-summary-btn-${book.id}`}
              onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
            >
              {t('summary')}
            </HeritageMenuItem>

            {onShare ? (
              <HeritageMenuItem
                icon={<HeritageIcon name="share" size={16} />}
                data-testid={`book-share-btn-${book.id}`}
                onClick={() => onShare(book)}
              >
                {t('share')}
              </HeritageMenuItem>
            ) : null}
          </HeritageMoreMenu>
        </>
      }
    />
  );
}
