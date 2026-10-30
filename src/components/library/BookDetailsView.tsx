import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Heart,
  Layers,
  Quote,
  Share2,
  ZoomIn
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/I18nProvider';
import {
  classifyShelfDiscipline,
  DisciplineOrnament,
  getBookCloth
} from '@/lib/editorial-cloth';
import { cn } from '@/lib/utils';
import { formatCitation, getBookKeyPoints, getCategoryLabel } from '@/services/catalog';
import type { Book } from '@/types/book';
import { RatingStars } from './RatingStars';

export interface BookDetailsViewProps {
  book: Book;
  isFavorite: boolean;
  isInBundle: boolean;
  isDownloadBusy?: boolean;
  onBackToList: () => void;
  onPrevBook?: () => void;
  onNextBook?: () => void;
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
 * Two-Column Editorial Monograph Spread (`?book=ID`).
 * Combines the museum-grade editorial spread typography, 4-column hairline specification grid,
 * numbered 01..04 keypoints, and RTL/LTR-aware 3D hardcover book pedestal with full
 * PDF reading, downloading, APA citation, rating, bundle, and cover zoom functionality.
 */
export function BookDetailsView({
  book,
  isFavorite,
  isInBundle,
  isDownloadBusy = false,
  onBackToList,
  onPrevBook,
  onNextBook,
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
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const hardcoverRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
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
  const category = getCategoryLabel(book, lang);
  const keyPoints = getBookKeyPoints(book, lang);
  const apaText = formatCitation(book, lang);
  const hasFile = Boolean(book.file_path);

  const cloth = getBookCloth(book.id);
  const discipline = classifyShelfDiscipline(book);
  const showCoverImg = Boolean(book.cover_image && failedCoverUrl !== book.cover_image);
  const codeNum = String(book.id).padStart(3, '0');

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

  // Subtle interactive 3D hardcover tilt on desktop mouse move
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const baseRotY = isRTL ? -17 : 17;
    if (hardcoverRef.current) {
      hardcoverRef.current.style.transform = `rotateY(${baseRotY}deg) rotateX(3deg)`;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!hardcoverRef.current || window.innerWidth < 1024) return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      const rotY = baseRotY + nx * 13;
      const rotX = 3 - ny * 9;
      hardcoverRef.current.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg)`;

      if (sheenRef.current) {
        const sx = 35 + nx * 40;
        const sy = 25 + ny * 40;
        sheenRef.current.style.background = `radial-gradient(circle at ${sx}% ${sy}%, rgba(255,255,255,0.16) 0%, transparent 62%)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isRTL, book.id]);

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
      {/* Top Monograph Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline-border-strong pb-4">
        <button
          type="button"
          id="btnBackToList"
          data-testid="back-to-library-btn"
          onClick={onBackToList}
          className="inline-flex items-center gap-2 rounded-[4px] border hairline-border-strong bg-transparent px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background cursor-pointer"
        >
          <BackIcon className="size-4 shrink-0" aria-hidden="true" />
          <span id="txtBackToList">{t('txtBackToList')}</span>
          <kbd className="hidden sm:inline-block rounded-[3px] border border-current px-1.5 py-0.2 font-mono text-[10px] opacity-65">
            ESC
          </kbd>
        </button>

        <div className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
          IAR ARCHIVE · MONOGRAPH {codeNum}
        </div>

        {(onPrevBook || onNextBook) && (
          <div className="flex items-center gap-2 text-xs font-medium">
            {onPrevBook && (
              <button
                type="button"
                data-testid="single-prev-book-btn"
                onClick={onPrevBook}
                className="px-1.5 py-1 text-secondary-foreground transition-colors hover:text-primary cursor-pointer"
              >
                {t('previous')}
              </button>
            )}
            {onPrevBook && onNextBook && (
              <span aria-hidden="true" className="text-border">
                /
              </span>
            )}
            {onNextBook && (
              <button
                type="button"
                data-testid="single-next-book-btn"
                onClick={onNextBook}
                className="px-1.5 py-1 text-secondary-foreground transition-colors hover:text-primary cursor-pointer"
              >
                {t('next')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Two-Column Editorial Monograph Spread */}
      <article className="rounded-[4px] border hairline-border-strong bg-card p-5 sm:p-8 lg:p-10 text-card-foreground doc-shadow">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.32fr_0.88fr] lg:gap-12 items-start">
          {/* Column 1 (Start): Editorial Bibliographic Sheet */}
          <div className="min-w-0 space-y-5 order-2 lg:order-1">
            {/* Terracotta Rubric */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
              <span id="singleBookCategory">{category}</span>
              <span aria-hidden="true">·</span>
              <span id="singleBookType" className="text-muted-foreground font-medium">
                {bookType}
              </span>
            </div>

            {/* Monumental Amiri Title & Bilingual Subtitle */}
            <div className="space-y-1.5">
              <h1
                id="singleBookTitle"
                data-testid="single-book-title"
                className="font-serif text-2xl sm:text-3xl lg:text-[2.35rem] font-bold tracking-tight text-foreground leading-[1.24]"
              >
                {title}
              </h1>

              {secondaryTitle && (
                <p
                  dir={lang === 'ar' ? 'ltr' : 'rtl'}
                  className="font-mono text-xs text-muted-foreground text-start"
                >
                  {secondaryTitle}
                </p>
              )}
            </div>

            {/* Lead Abstract */}
            <div className="space-y-1.5">
              <h2 id="singleDescLabel" className="sr-only">
                {t('singleDescLabel')}
              </h2>
              <p
                id="singleBookDescription"
                className="text-sm sm:text-[15px] text-secondary-foreground leading-[1.8] max-w-[66ch]"
              >
                {description}
              </p>
            </div>

            {/* 4-Column Architectural Hairline Specification Grid */}
            <dl className="grid grid-cols-2 sm:grid-cols-4 border-y hairline-border-strong">
              <div className="py-3 pe-3 border-b sm:border-b-0 border-e hairline-border">
                <dt className="mb-1 text-[11px] text-muted-foreground">
                  {translate('المؤلف / الجهة المصدرة', 'Author / Issuer')}
                </dt>
                <dd
                  id="singleBookAuthor"
                  className="text-xs sm:text-[13px] font-semibold text-foreground leading-snug"
                >
                  {author || publisher || t('unknown')}
                </dd>
                {author && publisher && publisher !== author && (
                  <dd className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {publisher}
                  </dd>
                )}
              </div>

              <div className="py-3 px-3 border-b sm:border-b-0 sm:border-e hairline-border">
                <dt className="mb-1 text-[11px] text-muted-foreground">
                  {translate('سنة الإصدار', 'Publication Year')}
                </dt>
                <dd className="font-mono text-xs sm:text-[13px] font-semibold text-foreground tabular-nums">
                  {book.year && book.year !== '0' ? book.year : t('noDate')}
                </dd>
              </div>

              <div className="py-3 pe-3 sm:px-3 border-e hairline-border">
                <dt className="mb-1 text-[11px] text-muted-foreground">
                  {translate('عدد الصفحات', 'Pagination')}
                </dt>
                <dd className="text-xs sm:text-[13px] font-semibold text-foreground tabular-nums">
                  {book.pages && book.pages !== '0'
                    ? `${book.pages} ${t('pagesUnit')}`
                    : '—'}
                </dd>
              </div>

              <div className="py-3 ps-3">
                <dt className="mb-1 text-[11px] text-muted-foreground">
                  {translate('الوعاء والحجم', 'Format & Size')}
                </dt>
                <dd className="font-mono text-xs sm:text-[13px] font-semibold text-foreground tabular-nums">
                  PDF{book.file_size ? ` · ${book.file_size}` : ''}
                </dd>
              </div>
            </dl>

            {/* Primary & Secondary Editorial Action Suite */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                id="singleReadBtn"
                disabled={!hasFile}
                data-testid="single-read-btn"
                onClick={() => onRead(book)}
                className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-foreground bg-foreground px-5 text-xs sm:text-sm font-semibold text-background transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                <BookOpen className="size-4 shrink-0" aria-hidden="true" />
                <span id="singleReadLabel">
                  {translate('مطالعة الوثيقة المرجعية', 'Read Reference Document')}
                </span>
              </button>

              <button
                type="button"
                id="singleDownloadBtn"
                disabled={!hasFile || isDownloadBusy}
                data-testid="single-download-btn"
                onClick={() => onDownload(book)}
                className="inline-flex h-10 items-center gap-2 rounded-[4px] border hairline-border-strong bg-background px-4 text-xs sm:text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-secondary disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                <Download className="size-4 shrink-0" aria-hidden="true" />
                <span id="singleDownloadLabel">{t('singleDownloadLabel')}</span>
                {book.downloadCount > 0 && (
                  <span
                    id="singleDownloadCount"
                    className="rounded-xs bg-secondary px-1.5 py-0.2 font-mono text-[11px] font-semibold tabular-nums"
                  >
                    {formatNumber(book.downloadCount)}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="singleCiteBtn"
                data-testid="single-cite-btn"
                onClick={handleCopyApa}
                className="inline-flex h-10 items-center gap-2 rounded-[4px] border hairline-border-strong bg-background px-4 text-xs sm:text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-secondary cursor-pointer"
              >
                {copiedApa ? (
                  <Check className="size-4 text-primary shrink-0" aria-hidden="true" />
                ) : (
                  <Quote className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span id="singleCiteLabel">{t('singleCiteLabel')}</span>
              </button>

              <button
                type="button"
                data-testid="single-bundle-btn"
                aria-pressed={isInBundle}
                onClick={() => onToggleBundle(book.id)}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors cursor-pointer',
                  isInBundle
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'hairline-border-strong bg-background text-secondary-foreground hover:border-foreground hover:text-foreground'
                )}
              >
                <Layers className="size-3.5 shrink-0" aria-hidden="true" />
                <span>{t('bundleCheckboxLabel')}</span>
              </button>

              <button
                type="button"
                data-testid="single-favorite-btn"
                aria-pressed={isFavorite}
                aria-label={isFavorite ? t('removeFavorite') : t('addFavorite')}
                onClick={() => onToggleFavorite(book.id)}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-[4px] border px-3 text-xs font-medium transition-colors cursor-pointer',
                  isFavorite
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'hairline-border-strong bg-background text-secondary-foreground hover:border-foreground hover:text-foreground'
                )}
              >
                <Heart
                  className={cn('size-3.5 shrink-0', isFavorite && 'fill-current')}
                  aria-hidden="true"
                />
                <span>{t('favorite')}</span>
              </button>

              <button
                type="button"
                id="singleShareBtn"
                data-testid="single-share-btn"
                onClick={() => onShare(book)}
                className="inline-flex h-10 items-center gap-1.5 rounded-[4px] border hairline-border bg-transparent px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground cursor-pointer"
              >
                <Share2 className="size-3.5 shrink-0" aria-hidden="true" />
                <span id="singleShareLabel">{t('singleShareLabel')}</span>
              </button>
            </div>

            {/* Numbered 01..04 Keypoints List */}
            <div className="pt-2 space-y-2">
              <h2
                id="singleKeyPointsLabel"
                className="text-xs font-bold tracking-wider text-muted-foreground uppercase"
              >
                {t('singleKeyPointsLabel')}
              </h2>
              <ol
                id="singleBookKeyPoints"
                data-testid="single-book-keypoints"
                className="border-t hairline-border divide-y divide-[var(--hairline)] border-b"
              >
                {keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-3 py-2.5 text-xs sm:text-sm text-secondary-foreground leading-relaxed"
                  >
                    <span className="font-mono text-xs font-medium text-primary shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Target Audience & Interactive Rating Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs">
              {targetAudience && (
                <div className="text-muted-foreground">
                  <strong
                    id="singleAudienceLabel"
                    className="font-semibold text-foreground me-1.5"
                  >
                    {t('singleAudienceLabel')}:
                  </strong>
                  <span id="singleBookAudience">{targetAudience}</span>
                </div>
              )}

              <div
                id="singleRatingBox"
                className="inline-flex items-center gap-2 rounded-[4px] border hairline-border bg-background/70 px-3 py-1.5"
              >
                <span className="font-medium text-foreground">{t('rateReference')}:</span>
                <RatingStars book={book} onRate={onRate} size="md" />
              </div>
            </div>

            {/* Academic Citation (APA) Reference Box */}
            <div className="rounded-[4px] border hairline-border-strong bg-background/65 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground uppercase">
                  <Quote className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span>{t('txtModalApaTitle')}</span>
                </h2>

                <button
                  type="button"
                  data-testid="single-copy-apa-box-btn"
                  onClick={handleCopyApa}
                  className="rounded-[3px] border hairline-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
                >
                  {copiedApa ? t('copiedToClipboard') : t('cite')}
                </button>
              </div>

              <pre
                dir="auto"
                data-testid="single-book-apa"
                className="whitespace-pre-wrap break-words rounded-[3px] border hairline-border bg-card p-3 font-mono text-xs text-foreground/90 leading-relaxed"
              >
                {apaText}
              </pre>
            </div>
          </div>

          {/* Column 2 (End): 3D Cloth-Bound Hardcover Artifact Pedestal */}
          <div className="flex flex-col items-center justify-center order-1 lg:order-2 lg:sticky lg:top-24 py-2">
            <div className="artifact-pedestal">
              <div
                ref={hardcoverRef}
                data-cloth={cloth}
                onClick={onZoomCover ? () => onZoomCover(book) : undefined}
                role={onZoomCover ? 'button' : undefined}
                tabIndex={onZoomCover ? 0 : undefined}
                aria-label={onZoomCover ? `${t('view')}: ${title}` : undefined}
                data-testid={`book-cover-btn-${book.id}`}
                onKeyDown={
                  onZoomCover
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onZoomCover(book);
                        }
                      }
                    : undefined
                }
                className={cn('hardcover-3d', onZoomCover && 'cursor-pointer')}
              >
                {/* Layered Cream Paper-Block Edge */}
                <div className="hardcover-pages-edge" aria-hidden="true" />

                {/* Cloth-Bound Front Hardcover Board */}
                <div className="hardcover-front">
                  <div className="cover-hinge-groove" aria-hidden="true" />
                  <div
                    ref={sheenRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20"
                    style={{
                      background:
                        'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.12) 0%, transparent 60%)'
                    }}
                  />

                  {showCoverImg ? (
                    <div className="flex size-full flex-col justify-between p-4 ps-6">
                      <div
                        className="flex items-center justify-between border-b pb-2 font-mono text-[10px] tracking-[0.15em]"
                        style={{
                          color: 'var(--cloth-muted)',
                          borderColor: 'var(--cloth-rule)'
                        }}
                      >
                        <span>IAR ARCHIVE</span>
                        <span>NO. {String(book.id).padStart(2, '0')}</span>
                      </div>

                      <div
                        className="my-2.5 flex-1 overflow-hidden rounded-[2px] border bg-black/15 shadow-inner"
                        style={{ borderColor: 'var(--cloth-rule)' }}
                      >
                        <img
                          src={book.cover_image}
                          alt={title}
                          data-testid={`book-cover-img-${book.id}`}
                          onError={() => setFailedCoverUrl(book.cover_image)}
                          className="size-full object-cover"
                        />
                      </div>

                      <div
                        className="flex items-center justify-between gap-2 border-t pt-2 text-[10.5px]"
                        style={{
                          color: 'var(--cloth-muted)',
                          borderColor: 'var(--cloth-rule)'
                        }}
                      >
                        <span className="truncate">{category}</span>
                        <span className="font-mono">
                          {book.year && book.year !== '0' ? book.year : '2026'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      data-testid={`book-cover-fallback-${book.id}`}
                      className="flex size-full flex-col justify-between p-6 ps-8 text-start"
                    >
                      <div
                        className="flex items-center justify-between border-b pb-2.5 font-mono text-[10.5px] tracking-[0.16em]"
                        style={{
                          color: 'var(--cloth-muted)',
                          borderColor: 'var(--cloth-rule)'
                        }}
                      >
                        <span>IAR ARCHIVE</span>
                        <span>{String(book.id).padStart(2, '0')}</span>
                      </div>

                      <div
                        className="my-4 flex flex-1 items-center justify-center border bg-black/[0.06]"
                        style={{
                          borderColor: 'var(--cloth-rule)',
                          color: 'var(--cloth-accent)'
                        }}
                      >
                        <DisciplineOrnament
                          discipline={discipline}
                          className="size-28 opacity-90"
                        />
                      </div>

                      <div>
                        <span
                          className="mb-1.5 block text-xs font-semibold"
                          style={{ color: 'var(--cloth-accent)' }}
                        >
                          {category}
                        </span>
                        <h3 className="mb-3 line-clamp-3 font-serif text-xl font-bold leading-snug">
                          {title}
                        </h3>
                      </div>

                      <div
                        className="flex items-center justify-between gap-2 border-t pt-2.5 text-[11px]"
                        style={{
                          color: 'var(--cloth-muted)',
                          borderColor: 'var(--cloth-rule)'
                        }}
                      >
                        <span className="truncate">{author || 'IAR ARCHIVE'}</span>
                        <span className="font-mono">
                          {book.year && book.year !== '0' ? book.year : '2026'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="artifact-floor-shadow" aria-hidden="true" />
            </div>

            {onZoomCover && (
              <button
                type="button"
                onClick={() => onZoomCover(book)}
                data-testid="single-zoom-cover-btn"
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary cursor-pointer"
              >
                <ZoomIn className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="font-sans">
                  {translate(
                    'معاينة الغلاف بالحجم الكامل',
                    'Inspect full-resolution cover'
                  )}
                </span>
              </button>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
