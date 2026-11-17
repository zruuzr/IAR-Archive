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
      className="hx-panel hx-panel--dock mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4"
    >
      {/* Left/Start: Page count indicator */}
      <div className="hx-lib-meta order-2 sm:order-1 text-center sm:text-start">
        <span>{translate('الصفحة', 'Page')} </span>
        <strong className="hx-num">{formatNumber(currentPage)}</strong>
        <span> {translate('من أصل', 'of')} </span>
        <strong className="hx-num">{formatNumber(totalPages)}</strong>
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
              className="hx-pg hx-pg--nav shrink-0"
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
                  <span aria-hidden="true" className="hx-pg-dots">
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
                  className="hx-pg"
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
              className="hx-pg hx-pg--nav shrink-0"
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
