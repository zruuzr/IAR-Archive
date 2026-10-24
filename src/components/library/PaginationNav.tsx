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
      className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-card p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-border doc-shadow"
    >
      {/* Left/Start: Page count indicator */}
      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium order-2 sm:order-1 text-center sm:text-start">
        <span>{translate('الصفحة', 'Page')} </span>
        <span className="font-bold text-slate-900 dark:text-white font-mono">
          {formatNumber(currentPage)}
        </span>
        <span> {translate('من أصل', 'of')} </span>
        <span className="font-bold text-slate-900 dark:text-white font-mono">
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
                'inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-ring shrink-0',
                isFirstPage
                  ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-regal-900 hover:text-white hover:border-regal-900 dark:hover:bg-gold-500 dark:hover:text-regal-950 dark:hover:border-gold-500 cursor-pointer shadow-2xs'
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
                    className="text-xs font-mono text-slate-400 dark:text-slate-600"
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
                    'inline-flex size-8 sm:size-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-ring',
                    isCurrent
                      ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-regal-950 font-black shadow-sm border border-amber-400 scale-105'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-gold-500/60 hover:bg-gold-50/50 dark:hover:bg-slate-700'
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
                'inline-flex h-8 sm:h-9 items-center justify-center gap-1 rounded-xl border px-2 sm:px-3 text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-ring shrink-0',
                isLastPage
                  ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/40 cursor-not-allowed'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-regal-900 hover:text-white hover:border-regal-900 dark:hover:bg-gold-500 dark:hover:text-regal-950 dark:hover:border-gold-500 cursor-pointer shadow-2xs'
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
