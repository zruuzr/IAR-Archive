import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  HeritageBookCover,
  HeritageBookDetails,
  HeritageButton,
  HeritageGrid,
  HeritageIcon,
  HeritageIconButton,
  pickCloth
} from '@/components/heritage';
import { BaghdadiSquareKuficSeal } from '@/components/layout/HeritageOrnaments';
import { Button } from '@/components/ui/button';
import { buildBookUrl } from '@/hooks/useBundle';
import { useI18n } from '@/i18n/I18nProvider';
import {
  clean,
  formatCitation,
  getBookKeyPoints,
  getCategoryLabel
} from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCard } from './BookCard';
import { RatingStars } from './RatingStars';

export interface BookDetailsViewProps {
  book: Book;
  isFavorite: boolean;
  isInBundle: boolean;
  isDownloadBusy?: boolean;
  prevBook?: Book | null;
  nextBook?: Book | null;
  relatedBooks?: readonly Book[];
  isFavoriteBook?: (bookId: number) => boolean;
  isBundleBook?: (bookId: number) => boolean;
  isBusyBook?: (bookId: number) => boolean;
  onBackToList: () => void;
  onPrevBook?: () => void;
  onNextBook?: () => void;
  onOpenBook?: (book: Book) => void;
  onSearchKeyword?: (keyword: string) => void;
  onRead: (book: Book) => void;
  onDownload: (book: Book) => void;
  onToggleFavorite: (bookId: number) => void;
  onToggleBundle: (bookId: number) => void;
  onCopyCitation: (book: Book) => void;
  onShare: (book: Book) => void;
  onZoomCover?: (book: Book) => void;
  onRate?: (bookId: number, stars: number) => void;
}

export interface BookNotFoundViewProps {
  requestedParam: string | null;
  onBackToList: () => void;
}

/**
 * Rendered when the URL contains an invalid or non-existent `?book=` parameter.
 */
export function BookNotFoundView({
  requestedParam,
  onBackToList
}: BookNotFoundViewProps) {
  const { isRTL, t, translate } = useI18n();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <section
      id="bookNotFoundView"
      role="region"
      aria-labelledby="bookNotFoundTitle"
      data-testid="book-not-found-view"
      className="mx-auto my-8 max-w-xl rounded-[4px] border hairline-border-strong bg-card p-6 sm:p-8 text-center text-card-foreground doc-shadow space-y-5"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border hairline-border-strong bg-secondary text-primary">
        <AlertCircle className="size-5" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1
          id="bookNotFoundTitle"
          data-testid="book-not-found-title"
          className="font-serif text-xl sm:text-2xl font-bold text-foreground"
        >
          {translate('المرجع غير موجود', 'Reference not found')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {translate(
            'لم نتمكن من العثور على المرجع المطلوب في الأرشيف. ربما تغيّر الرابط أو أُزيل المعرّف.',
            'We could not find the requested reference in the archive. The link may be outdated or invalid.'
          )}
          {requestedParam ? ` (${requestedParam})` : ''}
        </p>
      </div>

      <div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onBackToList}
          data-testid="not-found-back-btn"
          className="gap-2 rounded-[4px] bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
        >
          <BackIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('txtBackToList')}</span>
        </Button>
      </div>
    </section>
  );
}

/**
 * Single Reference Details Page (`?book=ID`), powered by v2 `HeritageBookDetails`:
 * mihrab niche lapis hero with 5:7 cover, facts strip, action & tool buttons,
 * numbered key points, clickable keywords, APA citation card, interactive rating,
 * Kufic verification stamp, prev/next navigation, and related references grid.
 */
export function BookDetailsView({
  book,
  isFavorite,
  isInBundle,
  isDownloadBusy = false,
  prevBook,
  nextBook,
  relatedBooks,
  isFavoriteBook,
  isBundleBook,
  isBusyBook,
  onBackToList,
  onPrevBook,
  onNextBook,
  onOpenBook,
  onSearchKeyword,
  onRead,
  onDownload,
  onToggleFavorite,
  onToggleBundle,
  onCopyCitation,
  onShare,
  onZoomCover,
  onRate
}: BookDetailsViewProps) {
  const { lang, isRTL, t, translate, getBookField, formatNumber } = useI18n();
  const [copiedApa, setCopiedApa] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const title = getBookField(book, 'title');
  const secondaryTitle =
    lang === 'ar'
      ? book.title_en && book.title_en !== book.title
        ? book.title_en
        : ''
      : book.title && book.title !== book.title_en
        ? book.title
        : '';
  const author = getBookField(book, 'author');
  const publisher = getBookField(book, 'publisher');
  const description = getBookField(book, 'description') || t('unknown');
  const targetAudience = getBookField(book, 'target_audience');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const badgeText = getBookField(book, 'badge_text');
  const category = getCategoryLabel(book, lang);
  const keyPoints = getBookKeyPoints(book, lang);
  const rawKeywords =
    lang === 'en' && book.keywords_en.length > 0 ? book.keywords_en : book.keywords;
  const keywords = rawKeywords.map(clean).filter(Boolean);
  const apaText = formatCitation(book, lang);
  const hasFile = Boolean(book.file_path);
  const yearValue = book.year && book.year !== '0' ? book.year : t('noDate');

  // Escape returns to shelf when no modal dialog is active; ArrowLeft/Right steps books
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        return;
      }

      if (e.key === 'Escape') {
        onBackToList();
      } else if (e.key === 'ArrowLeft') {
        if (isRTL ? onNextBook : onPrevBook) {
          (isRTL ? onNextBook : onPrevBook)?.();
        }
      } else if (e.key === 'ArrowRight') {
        if (isRTL ? onPrevBook : onNextBook) {
          (isRTL ? onPrevBook : onNextBook)?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRTL, onBackToList, onNextBook, onPrevBook]);

  const handleCopyApa = () => {
    onCopyCitation(book);
    setCopiedApa(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopiedApa(false);
    }, 2000);
  };

  const downloadLabel = book.file_size
    ? `${t('singleDownloadLabel')} (\u202A${book.file_size}\u202C)`
    : t('singleDownloadLabel');

  const relatedGrid =
    relatedBooks && relatedBooks.length > 0 && onOpenBook ? (
      <HeritageGrid>
        {relatedBooks.map((item) => (
          <BookCard
            key={item.id}
            book={item}
            viewMode="grid"
            isFavorite={isFavoriteBook ? isFavoriteBook(item.id) : false}
            isInBundle={isBundleBook ? isBundleBook(item.id) : false}
            isDownloadBusy={isBusyBook ? isBusyBook(item.id) : false}
            onRead={onRead}
            onDownload={onDownload}
            onToggleFavorite={onToggleFavorite}
            onToggleBundle={onToggleBundle}
            onCopyCitation={onCopyCitation}
            onOpenDetails={onOpenBook}
            onZoomCover={onZoomCover}
            onShare={onShare}
            onRate={onRate}
          />
        ))}
      </HeritageGrid>
    ) : undefined;

  return (
    <HeritageBookDetails
      id={book.id}
      title={title}
      subtitle={secondaryTitle || undefined}
      subtitleDir={lang === 'ar' ? 'ltr' : 'rtl'}
      category={category}
      type={bookType}
      badge={badgeText || undefined}
      authorLabel={t('authoredByPrefix')}
      author={author || undefined}
      publisher={publisher && publisher !== author ? publisher : undefined}
      facts={[
        {
          label: translate('سنة الإصدار', 'Publication Year'),
          value: yearValue,
          ltr: book.year !== '' && book.year !== '0'
        },
        {
          label: translate('عدد الصفحات', 'Pagination'),
          value:
            book.pages && book.pages !== '0'
              ? `${formatNumber(Number(book.pages))} ${t('pagesUnit')}`
              : '—'
        },
        {
          label: translate('الوعاء والحجم', 'Format & Size'),
          value: `PDF${book.file_size ? ` · ${book.file_size}` : ''}`,
          ltr: true
        }
      ]}
      description={description}
      keyPoints={keyPoints}
      keywords={keywords.length > 0 ? keywords : undefined}
      onKeyword={onSearchKeyword}
      audience={targetAudience || undefined}
      citation={apaText}
      citationCopied={copiedApa}
      onCopyCitation={handleCopyApa}
      cover={
        <HeritageBookCover
          title={title}
          category={category ?? undefined}
          year={book.year && book.year !== '0' ? book.year : '2026'}
          cloth={pickCloth(book.id)}
          image={book.cover_image || undefined}
          loading="eager"
          titleAs="span"
          decorative
          testIds={{
            image: `book-cover-img-${book.id}`,
            fallback: `book-cover-fallback-${book.id}`
          }}
        />
      }
      onZoomCover={onZoomCover ? () => onZoomCover(book) : undefined}
      actions={
        <>
          <HeritageButton
            variant="gold"
            id="singleReadBtn"
            data-testid="single-read-btn"
            disabled={!hasFile}
            onClick={() => onRead(book)}
          >
            <HeritageIcon name="read" size={18} />
            <span id="singleReadLabel">
              {translate('مطالعة الوثيقة المرجعية', 'Read Reference Document')}
            </span>
          </HeritageButton>

          <HeritageButton
            variant="ghost"
            id="singleDownloadBtn"
            data-testid="single-download-btn"
            disabled={!hasFile || isDownloadBusy}
            onClick={() => onDownload(book)}
          >
            <HeritageIcon name="download" size={18} />
            <span id="singleDownloadLabel">{downloadLabel}</span>
          </HeritageButton>
        </>
      }
      tools={
        <>
          <HeritageIconButton
            size="md"
            label={isFavorite ? t('removeFavorite') : t('addFavorite')}
            pressed={isFavorite}
            data-testid="single-favorite-btn"
            onClick={() => onToggleFavorite(book.id)}
          >
            <HeritageIcon name="octagram" size={20} />
          </HeritageIconButton>

          <HeritageIconButton
            size="md"
            label={
              isInBundle ? t('removeFromBundle') : `${t('addToBundlePrefix')}${title}`
            }
            pressed={isInBundle}
            data-testid="single-bundle-btn"
            onClick={() => onToggleBundle(book.id)}
          >
            <HeritageIcon name="bundle" size={20} />
          </HeritageIconButton>

          <HeritageIconButton
            size="md"
            label={t('singleShareLabel')}
            data-testid="single-share-btn"
            onClick={() => onShare(book)}
          >
            <HeritageIcon name="share" size={20} />
          </HeritageIconButton>

          <HeritageIconButton
            size="md"
            label={t('singleCiteLabel')}
            data-testid="single-cite-btn"
            onClick={handleCopyApa}
          >
            <HeritageIcon name={copiedApa ? 'check' : 'quote'} size={20} />
          </HeritageIconButton>
        </>
      }
      rating={<RatingStars book={book} onRate={onRate} size="md" />}
      ratingLabel={t('rateReference')}
      metrics={
        book.downloadCount > 0
          ? [{ label: t('downloadsUnit'), value: formatNumber(book.downloadCount) }]
          : undefined
      }
      stamp={{
        title: translate('ختم التوثيق الكوفي المربع', 'Square Kufic Verification Seal'),
        text: translate(
          'نسخة مرجعية مفهرسة وموثقة وفق نظام الأرشيف الأكاديمي.',
          'Verified archival reference edition cataloged under the academic index.'
        ),
        art: <BaghdadiSquareKuficSeal className="size-11 shrink-0" />
      }}
      onBack={onBackToList}
      previous={
        onPrevBook
          ? {
              title: prevBook ? getBookField(prevBook, 'title') : t('previous'),
              href: prevBook ? buildBookUrl(prevBook.id) : undefined,
              onClick: onPrevBook
            }
          : undefined
      }
      next={
        onNextBook
          ? {
              title: nextBook ? getBookField(nextBook, 'title') : t('next'),
              href: nextBook ? buildBookUrl(nextBook.id) : undefined,
              onClick: onNextBook
            }
          : undefined
      }
      related={relatedGrid}
      labels={{
        back: t('txtBackToList'),
        referenceNo: t('singleReferenceNoLabel'),
        about: t('singleDescLabel'),
        keyPoints: t('singleKeyPointsLabel'),
        keywords: t('singleKeywordsLabel'),
        audience: t('singleAudienceLabel'),
        citation: t('txtModalApaTitle'),
        copy: t('singleCopyCitationBtn'),
        copied: t('singleCopiedBtn'),
        previous: t('singlePrevBookLabel'),
        next: t('singleNextBookLabel'),
        related: t('singleRelatedLabel'),
        zoomCover: t('zoomCover')
      }}
    />
  );
}
