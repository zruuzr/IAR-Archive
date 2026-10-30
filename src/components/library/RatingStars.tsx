import { Star } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { Book } from '@/types/book';

export interface RatingStarsProps {
  book: Pick<Book, 'id' | 'publicRating' | 'ratingCount'>;
  onRate?: (bookId: number, stars: number) => void;
  size?: 'sm' | 'md';
  className?: string;
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * Interactive 1–5 star rating component matching js/ratings.js (`renderRatingStars`).
 * Supports keyboard and mouse interaction, hover preview, and displays the
 * formatted average rating + vote count (or "Be the first to rate" when count is 0).
 */
export function RatingStars({ book, onRate, size = 'sm', className }: RatingStarsProps) {
  const { t, formatNumber } = useI18n();
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const count = Math.max(0, Number(book.ratingCount) || 0);
  const average = count > 0 ? Number(book.publicRating) || 0 : 0;
  const roundedAverage = Math.round(average);
  const activeStars = hoverValue ?? roundedAverage;

  const summaryText =
    count > 0 ? `${average.toFixed(2)} · ${formatNumber(count)}` : t('beFirstToRate');

  const starIconClass = size === 'md' ? 'size-4' : 'size-3.5';

  return (
    <div
      role="group"
      aria-label={t('rateReference')}
      data-testid={`rating-stars-${book.id}`}
      className={cn('inline-flex flex-wrap items-center gap-1.5 text-xs', className)}
      onMouseLeave={() => setHoverValue(null)}
    >
      <div className="inline-flex items-center gap-0.5">
        {STAR_VALUES.map((value) => {
          const isActive = value <= activeStars;
          const starLabel = `${t('rateReference')} ${value}/5`;

          if (!onRate) {
            return (
              <span
                key={value}
                aria-hidden="true"
                className={cn(
                  'inline-flex items-center justify-center p-0.5',
                  isActive ? 'text-primary' : 'text-muted-foreground/35'
                )}
              >
                <Star className={cn(starIconClass, isActive && 'fill-primary')} />
              </span>
            );
          }

          return (
            <button
              key={value}
              type="button"
              onClick={() => onRate(book.id, value)}
              onMouseEnter={() => setHoverValue(value)}
              onFocus={() => setHoverValue(value)}
              onBlur={() => setHoverValue(null)}
              aria-label={starLabel}
              title={starLabel}
              data-testid={`rate-star-${book.id}-${value}`}
              className={cn(
                'inline-flex items-center justify-center rounded-xs p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring cursor-pointer',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/35 hover:text-primary/80'
              )}
            >
              <Star
                className={cn(starIconClass, isActive && 'fill-primary')}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <span
        data-testid={`rating-summary-${book.id}`}
        className="font-mono text-[11px] font-medium text-muted-foreground"
      >
        {summaryText}
      </span>
    </div>
  );
}
