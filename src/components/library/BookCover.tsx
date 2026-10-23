import { Asterisk, CircleDot, Command, GitBranch, Layers } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';

export interface BookCoverProps {
  book: Pick<Book, 'id' | 'title' | 'title_en' | 'year' | 'cover_image'>;
  featured?: boolean;
  className?: string;
  onClick?: (bookId: number) => void;
}

const COVER_TONE_CLASSES: readonly string[] = [
  'bg-gradient-to-br from-[#F4ECE0] via-[#E9DEC8] to-[#DECBA9] text-[#2B2114] border-[#C9B38C] dark:from-[#1B2232] dark:via-[#151B28] dark:to-[#101520] dark:text-[#ECE6D8] dark:border-[#2E384D]',
  'bg-gradient-to-br from-[#E7F0EE] via-[#D6E5E2] to-[#BBD3CE] text-[#142D2B] border-[#9ABBB5] dark:from-[#132629] dark:via-[#102023] dark:to-[#0C181B] dark:text-[#DDECEB] dark:border-[#244447]',
  'bg-gradient-to-br from-[#EFEAE2] via-[#E2D9CB] to-[#CFC2AE] text-[#231F1A] border-[#B8A88F] dark:from-[#201E29] dark:via-[#181720] dark:to-[#121118] dark:text-[#E8E2D8] dark:border-[#343144]',
  'bg-gradient-to-br from-[#F5EFE4] via-[#EAE0CE] to-[#D8C5A6] text-[#312312] border-[#C5AC84] dark:from-[#241E18] dark:via-[#1C1712] dark:to-[#14110D] dark:text-[#EFE4D2] dark:border-[#3D3326]',
  'bg-gradient-to-br from-[#EBF0F5] via-[#DCE4EE] to-[#C6D3E2] text-[#1A2533] border-[#A7B9CE] dark:from-[#16202E] dark:via-[#121A26] dark:to-[#0D131C] dark:text-[#E2E8F0] dark:border-[#29384D]'
] as const;

function CoverSymbol({ index }: { index: number }) {
  const iconClass = 'size-5 opacity-75';
  switch (index % 5) {
    case 0:
      return <Command className={iconClass} aria-hidden="true" />;
    case 1:
      return <GitBranch className={iconClass} aria-hidden="true" />;
    case 2:
      return <Layers className={iconClass} aria-hidden="true" />;
    case 3:
      return <Asterisk className={iconClass} aria-hidden="true" />;
    default:
      return <CircleDot className={iconClass} aria-hidden="true" />;
  }
}

/**
 * Displays a book's cover image with an automatic, typographically designed
 * Bayt al-Hikma editorial cover fallback when the image is missing or fails to load.
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
  const toneIndex = Math.abs(book.id) % 5;
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
          className="size-full object-cover transition-transform duration-300 group-hover/cover:scale-[1.02]"
        />
      ) : (
        <span
          data-testid={`book-cover-fallback-${book.id}`}
          className={cn(
            'flex size-full flex-col justify-between p-3 text-start select-none border',
            COVER_TONE_CLASSES[toneIndex]
          )}
        >
          <span className="flex items-center justify-between gap-1 text-[10px] font-mono uppercase tracking-wider opacity-75">
            <span className="truncate">IAR / {book.year || 'ARCHIVE'}</span>
            <CoverSymbol index={toneIndex} />
          </span>

          <span className="my-auto line-clamp-4 text-xs sm:text-[13px] font-bold leading-snug tracking-tight">
            {title}
          </span>

          <span className="border-t border-current/15 pt-1.5 text-[9px] font-mono uppercase tracking-widest opacity-65">
            IAR ARCHIVE
          </span>
        </span>
      )}
      {/* Realistic Book Spine Highlight & Perimeter Sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 start-0 w-2.5 bg-gradient-to-r from-black/25 via-white/10 to-transparent z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10 z-10"
      />
    </>
  );

  const containerClasses = cn(
    'group/cover book-cover-tactile relative overflow-hidden rounded-lg border border-border/80 bg-secondary/40 shrink-0 aspect-[3/4]',
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
