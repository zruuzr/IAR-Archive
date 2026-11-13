import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { HeritageIcon } from '@/components/heritage';
import {
  AbbasidShamsaWatermark,
  BaghdadiSquareKuficSeal
} from '@/components/layout/HeritageOrnaments';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import {
  DISCIPLINE_FACETS,
  ERA_FACETS,
  matchesDisciplineFacet,
  matchesEraFacet,
  TYPE_FACETS,
  type DisciplineFacet
} from '@/lib/sovereign-facets';
import type { Book } from '@/types/book';

export interface SovereignSidebarProps {
  books: Book[];
  activeCategory: string;
  activeIssuer?: string;
  activeEra?: string;
  activeType?: string;
  onSelectCategory: (category: string) => void;
  onSelectIssuer: (issuer: string) => void;
  onSelectEra: (era: string) => void;
  onSelectType: (type: string) => void;
  onResetFilters: () => void;
}

/**
 * Heritage Archival Sidebar for Administrative Sciences.
 * Multi-dimensional faceted taxonomy for Discipline, Publication Era, and Reference Type.
 * Responsive: Collapsible accordion on mobile/tablet to conserve vertical rhythm,
 * and persistent Heritage panel on desktop.
 */
export function SovereignSidebar({
  books,
  activeCategory: _activeCategory,
  activeIssuer = '',
  activeEra = 'era_all',
  activeType = 'type_all',
  onSelectCategory: _onSelectCategory,
  onSelectIssuer,
  onSelectEra,
  onSelectType,
  onResetFilters
}: SovereignSidebarProps) {
  const { lang, translate, formatNumber } = useI18n();
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Compute dynamic counts based on real books in books.json
  const getDisciplineCount = (facet: DisciplineFacet): number => {
    return books.filter((b) => matchesDisciplineFacet(b, facet.id)).length;
  };

  const getEraCount = (eraId: string): number => {
    return books.filter((b) => matchesEraFacet(b, eraId)).length;
  };

  const hasAnyFilterActive =
    activeIssuer !== '' || activeEra !== 'era_all' || activeType !== 'type_all';

  return (
    <aside
      aria-label={translate('تصفية المراجع الإدارية', 'Filter Management References')}
      className="space-y-4 lg:space-y-6"
    >
      {/* Mobile Collapsible Accordion Header (< lg screens) */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-expanded={isMobileOpen}
          aria-controls="sovereignFacetsPanel"
          className="hx-panel w-full flex items-center justify-between p-3.5 font-semibold text-xs text-[var(--hx-ink)] cursor-pointer transition-colors hover:border-[var(--hx-gold)]"
        >
          <div className="flex items-center gap-2">
            <Filter
              className="size-3.5 text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] shrink-0"
              aria-hidden="true"
            />
            <span>
              {translate('تصفية وفهرسة المراجع الإدارية', 'Filter Management References')}
            </span>
            {hasAnyFilterActive && (
              <span className="rounded-full bg-[var(--hx-chip-on-bg)] text-[var(--hx-chip-on-ink)] px-2 py-0.5 text-[10px] font-bold">
                {translate('نشط', 'ACTIVE')}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'size-4 transition-transform duration-200 text-[var(--hx-muted)]',
              isMobileOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Main Architectural Index Facet Panel */}
      <div
        id="sovereignFacetsPanel"
        className={cn(
          'hx-panel relative overflow-hidden p-5 transition-all',
          !isMobileOpen && 'hidden lg:block'
        )}
      >
        <AbbasidShamsaWatermark variant="sidebar" />

        {/* Header & Reset Button */}
        <div className="relative flex items-center justify-between gap-2 pb-3.5 border-b border-[var(--hx-line)] mb-4">
          <div className="space-y-0.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]">
              <HeritageIcon name="octagram" size={11} />
              <span>{translate('الفهرس · التصنيف الدقيق', 'INDEX · FACETS')}</span>
            </span>
            <h3 className="font-serif font-bold text-lg text-[var(--hx-ink)] flex items-center gap-2">
              <span>{translate('تصفية المراجع الإدارية', 'Management Facets')}</span>
            </h3>
          </div>

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)] hover:underline flex items-center gap-1 cursor-pointer transition-colors font-semibold shrink-0"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>{translate('إعادة تعيين', 'Reset')}</span>
            </button>
          )}
        </div>

        {/* Facet 1: Administrative Sciences Discipline */}
        <div className="relative space-y-2 mb-5">
          <p className="text-xs font-semibold text-[var(--hx-muted)] flex items-center gap-1.5">
            <HeritageIcon
              name="octagram"
              size={10}
              className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
            />
            <span>{translate('الحقل الإداري والمعرفي', 'Management Discipline')}</span>
          </p>
          <div className="space-y-1">
            {DISCIPLINE_FACETS.map((facet) => {
              const isSelected =
                activeIssuer === facet.id || activeIssuer === facet.keyword;
              const count = getDisciplineCount(facet);
              return (
                <button
                  key={facet.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-active={isSelected}
                  onClick={() => onSelectIssuer(isSelected ? '' : facet.id)}
                  className="hx-facet-btn cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-[var(--hx-gold-bright)] dark:border-current bg-white/15 dark:bg-black/15 text-current'
                          : 'border-[var(--hx-line-2)] bg-[var(--hx-surface)]'
                      )}
                    >
                      {isSelected && <HeritageIcon name="check" size={11} />}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? facet.name : facet.nameEn}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[11px] tabular-nums shrink-0 ms-2',
                      isSelected ? 'opacity-90' : 'text-[var(--hx-muted)]'
                    )}
                  >
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 2: Publication Era & Decades */}
        <div className="relative space-y-2 mb-5 pt-4 border-t border-[var(--hx-line)]">
          <p className="text-xs font-semibold text-[var(--hx-muted)] flex items-center gap-1.5">
            <HeritageIcon
              name="octagram"
              size={10}
              className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
            />
            <span>{translate('الحقبة وتاريخ النشر', 'Publication Era')}</span>
          </p>
          <div className="space-y-1">
            {ERA_FACETS.map((era) => {
              const isSelected = activeEra === era.id;
              const count = era.id === 'era_all' ? books.length : getEraCount(era.id);
              return (
                <button
                  key={era.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-active={isSelected}
                  onClick={() => onSelectEra(era.id)}
                  className="hx-facet-btn cursor-pointer"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-[var(--hx-gold-bright)] dark:border-current'
                          : 'border-[var(--hx-line-2)] bg-[var(--hx-surface)]'
                      )}
                    >
                      {isSelected && (
                        <span className="size-2 rounded-full bg-[var(--hx-gold-bright)] dark:bg-current" />
                      )}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? era.label : era.labelEn}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-mono text-[11px] tabular-nums shrink-0 ms-2',
                      isSelected ? 'opacity-90' : 'text-[var(--hx-muted)]'
                    )}
                  >
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 3: Content / Reference Type */}
        <div className="relative space-y-2.5 pt-4 border-t border-[var(--hx-line)]">
          <p className="text-xs font-semibold text-[var(--hx-muted)] flex items-center gap-1.5">
            <HeritageIcon
              name="octagram"
              size={10}
              className="text-[var(--hx-gold-ink)] dark:text-[var(--hx-gold-bright)]"
            />
            <span>{translate('طبيعة المرجع والمحتوى', 'Reference Nature')}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FACETS.map((type) => {
              const isSelected = activeType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-active={isSelected}
                  onClick={() => onSelectType(type.id)}
                  className="hx-facet-pill cursor-pointer"
                >
                  {lang === 'ar' ? type.label : type.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Miniature Baghdadi Square Kufic Archival Colophon Stamp */}
        <div
          data-testid="sidebar-kufic-colophon"
          className="relative mt-5 flex items-center gap-3 border-t border-dashed border-[var(--hx-line-2)] pt-3.5"
        >
          <BaghdadiSquareKuficSeal size={44} surfaceFill="var(--hx-surface)" />
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-[var(--hx-ink)]">
              {translate('الفهرس العراقي الموثق', 'Verified Iraqi Index')}
            </div>
            <div className="truncate text-[11px] text-[var(--hx-muted)]">
              {translate(
                'ختم الضبط الببليوغرافي · بغداد',
                'Bibliographic Control Seal · Baghdad'
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
