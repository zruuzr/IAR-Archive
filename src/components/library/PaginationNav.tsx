import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';
import type { PaginationToken } from '@/types/book';

export interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  tokens: readonly PaginationToken[];
  onPageChange: (nextPage: number) => void;
}

/**
 * Heritage Archival Pagination Bar.
 * Styled as a rounded Heritage dock with crisp active markers,
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
      className="hx-panel mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4"
    >
      {/* Left/Start: Page count indicator */}
      <div className="text-xs text-[var(--hx-muted)] font-medium order-2 sm:order-1 text-center sm:text-start">
        <span>{translate('الصفحة', 'Page')} </span>
        <span className="font-semibold text-[var(--hx-ink)] font-mono tabular-nums">
          {formatNumber(currentPage)}
        </span>
        <span> {translate('من أصل', 'of')} </span>
        <span className="font-semibold text-[var(--hx-ink)] font-mono tabular-nums">
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
          className="flex items-center justify-center gap-1.5 shrink-0 px-1"
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
              className="hx-page-btn gap-1 sm:px-3 font-sans"
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
                    className="text-xs font-mono text-[var(--hx-muted)]"
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
                  className="hx-page-btn tabular-nums cursor-pointer"
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
              className="hx-page-btn gap-1 sm:px-3 font-sans"
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
