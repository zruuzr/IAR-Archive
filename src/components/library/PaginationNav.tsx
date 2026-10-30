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
 * Sovereign Archival Pagination Bar.
 * Styled as an institutional dock with golden active page markers,
 * clear RTL/LTR directional controls, and responsive page status information.
 */
export function PaginationNav({
  currentPage,
  totalPages,
  tokens,
  onPageChange
}: PaginationNavProps) {
  const { isRTL, t, translate, formatNumber } = useI18n();

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
      className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-[4px] border hairline-border-strong doc-shadow"
    >
      {/* Left/Start: Page count indicator */}
      <div className="text-xs text-muted-foreground font-medium order-2 sm:order-1 text-center sm:text-start">
        <span>{translate('الصفحة', 'Page')} </span>
        <span className="font-semibold text-foreground font-mono tabular-nums">
          {formatNumber(currentPage)}
        </span>
        <span> {translate('من أصل', 'of')} </span>
        <span className="font-semibold text-foreground font-mono tabular-nums">
          {formatNumber(totalPages)}
        </span>
        <span className="hidden sm:inline">
          {' '}
          {translate('صفحة مفهرسة في الأرشيف', 'indexed pages')}
        </span>
      </div>

      {/* Center/End: Pagination Buttons List */}
      <div className="w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5 order-1 sm:order-2 flex justify-center">
        <ul
          id="paginationContainer"
          className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0 px-1"
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
              aria-label={t('previous')}
              title={t('previous')}
              className={cn(
                'inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-[3px] border px-2 sm:px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring shrink-0',
                isFirstPage
                  ? 'hairline-border text-muted-foreground/45 bg-secondary/40 cursor-not-allowed'
                  : 'hairline-border-strong bg-background/80 text-foreground hover:bg-foreground hover:text-background hover:border-foreground cursor-pointer'
              )}
            >
              <PrevIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t('previous')}</span>
            </button>
          </li>

          {/* Page Number & Ellipsis Tokens */}
          {tokens.map((token, idx) => {
            if (token === 'ellipsis') {
              return (
                <li
                  key={`ellipsis-${idx}`}
                  className="px-0.5 sm:px-1 select-none shrink-0"
                >
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
              <li key={`page-${token}`} className="shrink-0">
                <button
                  type="button"
                  data-page={token}
                  data-testid={`pagination-page-${token}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => onPageChange(token)}
                  className={cn(
                    'inline-flex size-8 sm:size-9 items-center justify-center rounded-[3px] font-mono text-xs font-semibold tabular-nums transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                    isCurrent
                      ? 'bg-foreground text-background border border-foreground'
                      : 'border hairline-border-strong bg-background/80 text-foreground hover:border-primary hover:text-primary'
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
              aria-label={t('next')}
              title={t('next')}
              className={cn(
                'inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-[3px] border px-2 sm:px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring shrink-0',
                isLastPage
                  ? 'hairline-border text-muted-foreground/45 bg-secondary/40 cursor-not-allowed'
                  : 'hairline-border-strong bg-background/80 text-foreground hover:bg-foreground hover:text-background hover:border-foreground cursor-pointer'
              )}
            >
              <span className="hidden sm:inline">{t('next')}</span>
              <NextIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
