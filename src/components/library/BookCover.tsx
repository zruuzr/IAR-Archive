import { HeritageBookCover, pickCloth } from '@/components/heritage';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';

export interface BookCoverProps {
  book: Pick<
    Book,
    'id' | 'title' | 'title_en' | 'year' | 'cover_image' | 'category' | 'category_en'
  >;
  featured?: boolean;
  badge?: string;
  decorative?: boolean;
  className?: string;
  onClick?: (bookId: number) => void;
}

/**
 * Displays a book's real cover image inside an archival cloth-spined frame,
 * delegating image fallback and 5:7 proportions to `HeritageBookCover`.
 */
export function BookCover({
  book,
  featured = false,
  badge,
  decorative = false,
  className,
  onClick
}: BookCoverProps) {
  const { lang, t } = useI18n();

  const title = lang === 'en' && book.title_en ? book.title_en : book.title;
  const category = lang === 'en' && book.category_en ? book.category_en : book.category;

  return (
    <HeritageBookCover
      title={title}
      category={category ?? undefined}
      year={book.year && book.year !== '0' ? book.year : '2026'}
      cloth={pickCloth(book.id)}
      image={book.cover_image || undefined}
      loading={featured ? 'eager' : 'lazy'}
      fetchPriority={featured ? 'high' : undefined}
      badge={badge}
      decorative={decorative}
      titleAs="span"
      onClick={onClick ? () => onClick(book.id) : undefined}
      label={onClick ? `${t('view')}: ${title}` : undefined}
      testIds={{
        image: `book-cover-img-${book.id}`,
        fallback: `book-cover-fallback-${book.id}`,
        root: !decorative
          ? onClick
            ? `book-cover-btn-${book.id}`
            : `book-cover-${book.id}`
          : undefined
      }}
      className={cn(featured ? 'w-36 sm:w-44 md:w-48' : undefined, className)}
    />
  );
}
