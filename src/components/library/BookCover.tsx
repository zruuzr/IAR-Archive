import { useState } from 'react';
import { HeritageBookCover, pickCloth } from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import { getBookCloth } from '@/lib/editorial-cloth';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';

export interface BookCoverProps {
  book: Pick<
    Book,
    'id' | 'title' | 'title_en' | 'year' | 'cover_image' | 'category' | 'category_en'
  >;
  featured?: boolean;
  className?: string;
  onClick?: (bookId: number) => void;
}

/**
 * Displays a book's real cover image inside an archival cloth-spined frame,
 * with an automatic Heritage cloth cover fallback when `cover_image`
 * is empty or fails to load.
 */
export function BookCover({
  book,
  featured = false,
  className,
  onClick
}: BookCoverProps) {
  const { lang, t } = useI18n();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const title = lang === 'en' && book.title_en ? book.title_en : book.title;
  const category = lang === 'en' && book.category_en ? book.category_en : book.category;
  const cloth = getBookCloth(book.id);
  const heritageCloth = pickCloth(book.id);
  const showImage = Boolean(book.cover_image && failedUrl !== book.cover_image);

  const content = (
    <>
      {showImage ? (
        <img
          src={book.cover_image}
          alt={title}
          loading={featured ? 'eager' : 'lazy'}
          decoding="async"
          data-testid={`book-cover-img-${book.id}`}
          onError={() => setFailedUrl(book.cover_image)}
          className="size-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.015]"
        />
      ) : (
        <span
          data-cloth={cloth}
          data-testid={`book-cover-fallback-${book.id}`}
          className="block size-full"
        >
          <HeritageBookCover
            title={title}
            category={category ?? undefined}
            year={book.year && book.year !== '0' ? book.year : '2026'}
            cloth={heritageCloth}
            titleAs="span"
            className="size-full"
          />
        </span>
      )}

      {/* French-Joint Spine Groove & Crisp Perimeter Frame (for real cover images) */}
      {showImage && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 start-0 w-2.5 bg-gradient-to-r rtl:bg-gradient-to-l from-black/28 via-white/12 to-transparent z-10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[4px] ring-1 ring-inset ring-black/12 dark:ring-white/12 z-10"
          />
        </>
      )}
    </>
  );

  const containerClasses = cn(
    'group/cover book-cover-tactile relative overflow-hidden rounded-[4px] border hairline-border-strong bg-secondary/40 shrink-0 aspect-[3/4]',
    featured ? 'w-36 sm:w-44 md:w-48' : 'w-24 sm:w-28',
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(book.id)}
        aria-label={`${t('view')}: ${title}`}
        data-testid={`book-cover-btn-${book.id}`}
        className={cn(
          containerClasses,
          'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid={`book-cover-${book.id}`} className={containerClasses}>
      {content}
    </div>
  );
}
