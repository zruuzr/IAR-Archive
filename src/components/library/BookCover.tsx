import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import {
  classifyShelfDiscipline,
  DisciplineOrnament,
  getBookCloth
} from '@/lib/editorial-cloth';
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
 * with an automatic 9-pigment Book-Cloth Monograph fallback when `cover_image`
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
  const cloth = getBookCloth(book.id);
  const discipline = classifyShelfDiscipline({
    title: book.title,
    title_en: book.title_en,
    category: book.category ?? '',
    category_en: book.category_en ?? ''
  });
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
          className="cloth-weave flex size-full flex-col justify-between p-3 text-start select-none"
        >
          <span
            className="flex items-center justify-between gap-1 border-b pb-1.5 font-mono text-[9px] uppercase tracking-widest"
            style={{
              color: 'var(--cloth-muted)',
              borderColor: 'var(--cloth-rule)'
            }}
          >
            <span className="truncate">IAR · {String(book.id).padStart(2, '0')}</span>
            <span>{book.year && book.year !== '0' ? book.year : '2026'}</span>
          </span>

          <span
            className="my-1.5 flex flex-1 items-center justify-center border bg-black/[0.06]"
            style={{
              borderColor: 'var(--cloth-rule)',
              color: 'var(--cloth-accent)'
            }}
          >
            <DisciplineOrnament
              discipline={discipline}
              className={featured ? 'size-16 opacity-90' : 'size-11 opacity-90'}
            />
          </span>

          <span className="line-clamp-3 font-serif text-xs sm:text-[13px] font-bold leading-snug">
            {title}
          </span>

          <span
            className="mt-1.5 border-t pt-1 font-mono text-[8.5px] uppercase tracking-widest"
            style={{
              color: 'var(--cloth-muted)',
              borderColor: 'var(--cloth-rule)'
            }}
          >
            IAR ARCHIVE
          </span>
        </span>
      )}

      {/* French-Joint Spine Groove & Crisp Perimeter Frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-0 w-2.5 bg-gradient-to-r rtl:bg-gradient-to-l from-black/28 via-white/12 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[4px] ring-1 ring-inset ring-black/12 dark:ring-white/12 z-10"
      />
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
