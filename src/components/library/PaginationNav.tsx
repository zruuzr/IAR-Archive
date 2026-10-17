import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import type { PaginationToken } from '@/types/book';

export interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  tokens: readonly PaginationToken[];
  onPageChange: (nextPage: number) => void;
}

/**
 * Accessible pagination bar driven by `catalogResult.tokens` (`number | 'ellipsis'`).
 * Supports RTL/LTR directional icons, `aria-current="page"`, and ellipsis tokens.
 */
export function PaginationNav({
  currentPage,
  totalPages,
  tokens,
  onPageChange
}: PaginationNavProps) {
  const { isRTL, t, formatNumber } = useI18n();

  if (totalPages <= 1 || tokens.length === 0) {
    return null;
  }

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <nav
      aria-label={t('paginationAria')}
      data-testid="pagination-nav"
      className="mt-8 flex justify-center"
    >
      <ul
        id="paginationContainer"
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        {/* Previous Page Button */}
        <li>
          <button
            type="button"
            data-page-prev=""
            data-page={currentPage - 1}
            data-testid="pagination-prev"
            disabled={isFirstPage}
            onClick={() => onPageChange(currentPage - 1)}
            className={cn(
              'inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-2.5 sm:px-3 text-xs font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isFirstPage
                ? 'opacity-45 cursor-not-allowed'
                : 'hover:border-primary/50 hover:bg-secondary/70 cursor-pointer'
            )}
          >
            <PrevIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{t('previous')}</span>
          </button>
        </li>

        {/* Page Number & Ellipsis Tokens */}
        {tokens.map((token, idx) => {
          if (token === 'ellipsis') {
            return (
              <li key={`ellipsis-${idx}`} className="px-1.5 select-none">
                <span
                  aria-hidden="true"
                  className="text-xs font-mono text-muted-foreground"
                >
                  …
                </span>
              </li>
            );
          }

          const isCurrent = token === currentPage;
          return (
            <li key={`page-${token}`}>
              <button
                type="button"
                data-page={token}
                data-testid={`pagination-page-${token}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => onPageChange(token)}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                  isCurrent
                    ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                    : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary/70'
                )}
              >
                {formatNumber(token)}
              </button>
            </li>
          );
        })}

        {/* Next Page Button */}
        <li>
          <button
            type="button"
            data-page-next=""
            data-page={currentPage + 1}
            data-testid="pagination-next"
            disabled={isLastPage}
            onClick={() => onPageChange(currentPage + 1)}
            className={cn(
              'inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-2.5 sm:px-3 text-xs font-medium text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring',
              isLastPage
                ? 'opacity-45 cursor-not-allowed'
                : 'hover:border-primary/50 hover:bg-secondary/70 cursor-pointer'
            )}
          >
            <span>{t('next')}</span>
            <NextIcon className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
