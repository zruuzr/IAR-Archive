import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Download,
  FileText,
  HardDrive,
  Heart,
  Layers,
  Quote,
  Share2,
  Sparkles,
  Users,
  ZoomIn
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import { formatCitation, getBookKeyPoints, getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { BookCover } from './BookCover';
import { RatingStars } from './RatingStars';

export interface BookDetailsViewProps {
  book: Book;
  isFavorite: boolean;
  isInBundle: boolean;
  isDownloadBusy?: boolean;
  onBackToList: () => void;
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
 * Provides a clear message and a direct action to return to the library catalog.
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
      className="mx-auto my-8 max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8 text-center text-card-foreground shadow-sm space-y-5"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1
          id="bookNotFoundTitle"
          data-testid="book-not-found-title"
          className="text-lg sm:text-xl font-bold text-foreground"
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
          className="gap-2 font-medium"
        >
          <BackIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('txtBackToList')}</span>
        </Button>
      </div>
    </section>
  );
}

/**
 * Editorial reference details & 3-minute summary view (`?book=ID`).
 * Displays full bibliographic metadata, cover zoom trigger, interactive 1-5 star rating,
 * description, key points, target audience, APA citation block, and Read/Download/Favorite/Bundle/Share actions.
 */
export function BookDetailsView({
  book,
  isFavorite,
  isInBundle,
  isDownloadBusy = false,
  onBackToList,
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

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const title = getBookField(book, 'title');
  const author = getBookField(book, 'author');
  const publisher = getBookField(book, 'publisher');
  const description = getBookField(book, 'description') || t('unknown');
  const targetAudience = getBookField(book, 'target_audience');
  const bookType = getBookField(book, 'type') || t('defaultBookType');
  const category = getCategoryLabel(book, lang);
  const keyPoints = getBookKeyPoints(book, lang);
  const apaText = formatCitation(book, lang);
  const hasFile = Boolean(book.file_path);

  const handleCopyApa = () => {
    onCopyCitation(book);
    setCopiedApa(true);
    setTimeout(() => {
      setCopiedApa(false);
    }, 2000);
  };

  return (
    <section
      id="singleBookView"
      aria-labelledby="singleBookTitle"
      data-testid="book-details-view"
      className="space-y-6"
    >
      {/* Back to Library Navigation */}
      <div>
        <Button
          type="button"
          id="btnBackToList"
          variant="outline"
          size="sm"
          data-testid="back-to-library-btn"
          onClick={onBackToList}
          className="gap-2 font-medium"
        >
          <BackIcon className="size-4 shrink-0" aria-hidden="true" />
          <span id="txtBackToList">{t('txtBackToList')}</span>
        </Button>
      </div>

      {/* Main Editorial Sheet */}
      <article className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
        <div
          aria-hidden="true"
          className="h-1 w-full bg-gradient-to-r from-primary via-teal to-primary/40"
        />

        <div className="p-5 sm:p-7 lg:p-9 space-y-8">
          {/* Header Block: Cover + Primary Metadata + Actions */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start lg:gap-8">
            <div className="flex flex-col items-center md:items-start gap-2 shrink-0">
              <BookCover
                book={book}
                featured
                onClick={onZoomCover ? () => onZoomCover(book) : undefined}
                className="w-40 sm:w-48 md:w-52 shadow-md"
              />
              {onZoomCover && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onZoomCover(book)}
                  data-testid="single-zoom-cover-btn"
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ZoomIn className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{translate('تكبير الغلاف', 'Zoom cover')}</span>
                </Button>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  id="singleBookCategory"
                  className="inline-flex items-center rounded-md bg-teal/12 px-2.5 py-1 text-xs font-semibold text-teal"
                >
                  {category}
                </span>

                <span
                  id="singleBookType"
                  className="inline-flex items-center rounded-md border border-border bg-secondary/70 px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {bookType}
                </span>
              </div>

              <div className="space-y-1.5">
                <h1
                  id="singleBookTitle"
                  data-testid="single-book-title"
                  className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug"
                >
                  {title}
                </h1>

                {author && (
                  <p
                    id="singleBookAuthor"
                    className="text-sm sm:text-base font-medium text-muted-foreground"
                  >
                    {author}
                  </p>
                )}

                {publisher && (
                  <p className="text-xs text-muted-foreground">{publisher}</p>
                )}
              </div>

              {/* Bibliographic Chips */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground pt-1">
                {book.year && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/70 px-2.5 py-1 font-mono tabular-nums">
                    <Calendar
                      className="size-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span>{book.year}</span>
                  </span>
                )}

                {book.pages && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/70 px-2.5 py-1 tabular-nums">
                    <FileText
                      className="size-3.5 text-teal shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {book.pages} {t('pagesUnit')}
                    </span>
                  </span>
                )}

                {book.file_size && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/70 px-2.5 py-1 font-mono tabular-nums">
                    <HardDrive
                      className="size-3.5 text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                    <span>{book.file_size}</span>
                  </span>
                )}
              </div>

              {/* Interactive Rating Block */}
              <div
                id="singleRatingBox"
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border/80 bg-secondary/35 px-3 py-2"
              >
                <span className="text-xs font-medium text-foreground">
                  {t('rateReference')}:
                </span>
                <RatingStars book={book} onRate={onRate} size="md" />
              </div>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  id="singleDownloadBtn"
                  variant="default"
                  size="sm"
                  disabled={!hasFile || isDownloadBusy}
                  data-testid="single-download-btn"
                  onClick={() => onDownload(book)}
                  className="gap-1.5"
                >
                  <Download className="size-4 shrink-0" aria-hidden="true" />
                  <span id="singleDownloadLabel">{t('singleDownloadLabel')}</span>
                  {book.downloadCount > 0 && (
                    <span
                      id="singleDownloadCount"
                      className="rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[11px] font-semibold tabular-nums"
                    >
                      {formatNumber(book.downloadCount)}
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  id="singleReadBtn"
                  variant="outline"
                  size="sm"
                  disabled={!hasFile}
                  data-testid="single-read-btn"
                  onClick={() => onRead(book)}
                  className="gap-1.5"
                >
                  <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                  <span id="singleReadLabel">{t('singleReadLabel')}</span>
                </Button>

                <Button
                  type="button"
                  id="singleCiteBtn"
                  variant="outline"
                  size="sm"
                  data-testid="single-cite-btn"
                  onClick={handleCopyApa}
                  className="gap-1.5"
                >
                  {copiedApa ? (
                    <Check className="size-4 text-primary shrink-0" aria-hidden="true" />
                  ) : (
                    <Quote className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span id="singleCiteLabel">{t('singleCiteLabel')}</span>
                </Button>

                <Button
                  type="button"
                  variant={isInBundle ? 'secondary' : 'outline'}
                  size="sm"
                  data-testid="single-bundle-btn"
                  aria-pressed={isInBundle}
                  onClick={() => onToggleBundle(book.id)}
                  className={cn(
                    'gap-1.5',
                    isInBundle && 'border-primary text-primary font-semibold'
                  )}
                >
                  <Layers className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('bundleCheckboxLabel')}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="single-favorite-btn"
                  aria-pressed={isFavorite}
                  aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
                  onClick={() => onToggleFavorite(book.id)}
                  className={cn(
                    'gap-1.5',
                    isFavorite && 'text-destructive border-destructive/40'
                  )}
                >
                  <Heart
                    className={cn('size-4 shrink-0', isFavorite && 'fill-current')}
                    aria-hidden="true"
                  />
                  <span>{t('favorite')}</span>
                </Button>

                <Button
                  type="button"
                  id="singleShareBtn"
                  variant="ghost"
                  size="sm"
                  data-testid="single-share-btn"
                  onClick={() => onShare(book)}
                  className="gap-1.5"
                >
                  <Share2 className="size-4 shrink-0" aria-hidden="true" />
                  <span id="singleShareLabel">{t('singleShareLabel')}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Content Grid: Description, Key Points, Target Audience & APA Citation */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 border-t border-border pt-6">
            <div className="lg:col-span-7 space-y-6">
              {/* About This Reference */}
              <div className="space-y-2">
                <h2
                  id="singleDescLabel"
                  className="text-sm font-bold uppercase tracking-wider text-primary"
                >
                  {t('singleDescLabel')}
                </h2>
                <p
                  id="singleBookDescription"
                  className="text-sm sm:text-[15px] text-foreground/90 leading-[1.8]"
                >
                  {description}
                </p>
              </div>

              {/* Key Points (3-Minute Summary) */}
              <div className="space-y-2.5">
                <h2
                  id="singleKeyPointsLabel"
                  className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-primary"
                >
                  <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                  <span>{t('singleKeyPointsLabel')}</span>
                </h2>
                <ul
                  id="singleBookKeyPoints"
                  data-testid="single-book-keypoints"
                  className="space-y-2 rounded-xl border border-border/80 bg-background/60 p-4 text-sm text-foreground/90"
                >
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                      <span
                        aria-hidden="true"
                        className="mt-2 inline-block size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5">
              {/* Target Audience */}
              {targetAudience && (
                <div className="rounded-xl border border-border bg-background/60 p-4 space-y-1.5">
                  <h2
                    id="singleAudienceLabel"
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal"
                  >
                    <Users className="size-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('singleAudienceLabel')}</span>
                  </h2>
                  <p
                    id="singleBookAudience"
                    className="text-xs sm:text-sm text-foreground/85 leading-relaxed"
                  >
                    {targetAudience}
                  </p>
                </div>
              )}

              {/* Academic Citation (APA) Box */}
              <div className="rounded-xl border border-primary/30 bg-secondary/45 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Quote
                      className="size-3.5 text-primary shrink-0"
                      aria-hidden="true"
                    />
                    <span>{t('txtModalApaTitle')}</span>
                  </h2>

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    data-testid="single-copy-apa-box-btn"
                    onClick={handleCopyApa}
                    className="h-7 text-xs"
                  >
                    {copiedApa ? t('copiedToClipboard') : t('cite')}
                  </Button>
                </div>

                <pre
                  dir="auto"
                  data-testid="single-book-apa"
                  className="whitespace-pre-wrap break-words rounded-lg border border-border/80 bg-card p-3 font-mono text-xs text-foreground/90 leading-relaxed"
                >
                  {apaText}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
