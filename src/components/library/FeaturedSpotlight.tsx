import { BookOpen, Download, Layers, Quote, Share2, Sparkles } from 'lucide-react';
import {
  HeritageButton,
  HeritageFavButton,
  SpotlightPlaque,
  type SpotlightSpec
} from '@/components/heritage';
import { buildBookUrl } from '@/hooks/useBundle';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface FeaturedSpotlightProps {
  book: Book | null;
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
 * Editorial "In the Spotlight" featured reference card.
 * Built using the Iraqi Heritage presentation layer (`SpotlightPlaque` + `HeritageButton` / `HeritageFavButton`).
 */
export function FeaturedSpotlight({
  book,
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
}: FeaturedSpotlightProps) {
  const { lang, t, translate, getBookField, formatNumber } = useI18n();

  if (!book) {
    return null;
  }

  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const description = getBookField(book, 'description');
  const badgeText = getBookField(book, 'badge_text') || t('inTheSpotlight');
  const category = getCategoryLabel(book, lang);
  const publisher = getBookField(book, 'publisher');
  const targetAudience = getBookField(book, 'target_audience');
  const hasFile = Boolean(book.file_path);

  // Specs array
  const rawSpecs: (SpotlightSpec | null)[] = [
    publisher
      ? {
          label: translate('الناشر', 'Publisher'),
          value: publisher
        }
      : null,
    book.year && book.year !== '0'
      ? {
          label: translate('سنة النشر', 'Year'),
          value: book.year
        }
      : null,
    book.pages && book.pages !== '0'
      ? {
          label: translate('عدد الصفحات', 'Pages'),
          value: `${formatNumber(Number(book.pages))} ${t('pagesUnit')}`
        }
      : null,
    book.file_size
      ? {
          label: translate('حجم الملف', 'File Size'),
          value: String(book.file_size),
          ltr: true
        }
      : null,
    {
      label: translate('التقييم', 'Rating'),
      value: <RatingStars book={book} onRate={onRate} size="sm" />
    }
  ];
  const specs = rawSpecs.filter((s): s is SpotlightSpec => s !== null);

  // Key points
  const points =
    lang === 'en' && book.key_points_en && book.key_points_en.length > 0
      ? book.key_points_en
      : book.key_points && book.key_points.length > 0
        ? book.key_points
        : undefined;

  // Target audience
  const audience = targetAudience
    ? {
        label: translate('الفئة المستهدفة:', 'Target Audience:'),
        text: targetAudience
      }
    : undefined;

  const titleNode = (
    <a
      href={buildBookUrl(book.id)}
      data-testid={`spotlight-title-link-${book.id}`}
      onClick={(e) => {
        e.preventDefault();
        onOpenDetails(book);
      }}
      className="hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xs"
    >
      {title}
    </a>
  );

  const coverNode = (
    <BookCover
      book={book}
      featured
      onClick={() => (onZoomCover ?? onOpenDetails)(book)}
      className="w-44 sm:w-52 md:w-56 shadow-md hover:scale-[1.02] transition-transform duration-200"
    />
  );

  const primaryActionsNode = (
    <>
      <HeritageButton
        variant="gold"
        size="sm"
        disabled={!hasFile}
        data-testid={`spotlight-read-${book.id}`}
        onClick={() => onRead(book)}
        className="w-full justify-center shadow-xs"
      >
        <BookOpen className="size-4 shrink-0 inline-block me-1.5" aria-hidden="true" />
        <span>{t('read')}</span>
      </HeritageButton>

      <HeritageButton
        variant="ghost"
        size="sm"
        disabled={!hasFile || isDownloadBusy}
        data-testid={`spotlight-download-${book.id}`}
        onClick={() => onDownload(book)}
        className="w-full justify-center border border-[var(--hx-line)]"
      >
        <Download
          className="size-4 shrink-0 inline-block me-1.5 text-warning"
          aria-hidden="true"
        />
        <span>{t('download')}</span>
        {book.downloadCount > 0 && (
          <span
            data-download-count={book.id}
            className="ms-1 font-mono text-[11px] font-semibold tabular-nums opacity-90"
          >
            {formatNumber(book.downloadCount)}
          </span>
        )}
      </HeritageButton>
    </>
  );

  const secondaryActionsNode = (
    <>
      <HeritageButton
        variant="ghost"
        size="sm"
        data-testid={`spotlight-summary-${book.id}`}
        onClick={() => (onOpenSummary ?? onOpenDetails)(book)}
      >
        <Sparkles
          className="size-3.5 shrink-0 inline-block me-1.5 text-warning"
          aria-hidden="true"
        />
        <span>{t('summary')}</span>
      </HeritageButton>

      <HeritageButton
        variant="ghost"
        size="sm"
        data-testid={`spotlight-cite-${book.id}`}
        onClick={() => onCopyCitation(book)}
        aria-label={t('cite')}
        title={t('cite')}
      >
        <Quote className="size-3.5 shrink-0 inline-block me-1.5" aria-hidden="true" />
        <span className="hidden sm:inline">{t('cite')}</span>
      </HeritageButton>

      {onShare && (
        <HeritageButton
          variant="ghost"
          size="sm"
          data-testid={`spotlight-share-${book.id}`}
          onClick={() => onShare(book)}
          aria-label={t('share')}
          title={t('share')}
        >
          <Share2 className="size-3.5 shrink-0 inline-block me-1.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('share')}</span>
        </HeritageButton>
      )}

      <HeritageButton
        variant="ghost"
        size="sm"
        data-testid={`spotlight-bundle-${book.id}`}
        aria-pressed={isInBundle}
        aria-label={`${t('addToBundlePrefix')}${title}`}
        onClick={() => onToggleBundle(book.id)}
        className={cn('sm:ms-auto', isInBundle && 'hx-is-active')}
      >
        <Layers className="size-3.5 shrink-0 inline-block me-1.5" aria-hidden="true" />
        <span>{t('bundleCheckboxLabel')}</span>
      </HeritageButton>

      <HeritageFavButton
        pressed={isFavorite}
        onToggle={() => onToggleFavorite(book.id)}
        labelOn={t('removeFavorite')}
        labelOff={t('addFavorite')}
        data-testid={`spotlight-favorite-${book.id}`}
      />
    </>
  );

  return (
    <SpotlightPlaque
      id="featuredSection"
      testId="featured-spotlight"
      cardTestId={`spotlight-card-${book.id}`}
      friezeTestId="spotlight-ishtar-frieze"
      eyebrow={category}
      badge={badgeText}
      title={titleNode}
      author={author}
      description={description}
      specs={specs}
      points={points}
      audience={audience}
      primaryActions={primaryActionsNode}
      actions={secondaryActionsNode}
      cover={coverNode}
      className="mb-8"
    />
  );
}
