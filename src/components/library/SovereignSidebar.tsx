import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { useState } from 'react';
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
 * Sovereign Archival Sidebar for Administrative Sciences.
 * Multi-dimensional faceted taxonomy for Discipline, Publication Era, and Reference Type.
 * Responsive: Collapsible accordion on mobile/tablet to conserve vertical rhythm,
 * and persistent sovereign panel on desktop.
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
          className="hx-panel hx-facets-toggle"
        >
          <span className="flex items-center gap-2">
            <Filter
              className="size-4 text-[var(--hx-link)] shrink-0"
              aria-hidden="true"
            />
            <span>
              {translate('تصفية وفهرسة المراجع الإدارية', 'Filter Management References')}
            </span>
            {hasAnyFilterActive && (
              <span className="hx-tagpill">{translate('نشط', 'Active')}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'size-4 transition-transform duration-200 text-[var(--hx-ink-soft)]',
              isMobileOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Main Architectural Index Facet Panel */}
      <div
        id="sovereignFacetsPanel"
        className={cn('hx-panel hx-facets', !isMobileOpen && 'hidden lg:block')}
      >
        <AbbasidShamsaWatermark variant="sidebar" />

        {/* Header & Reset Button */}
        <div className="hx-facets-head">
          <div>
            <span className="hx-facets-kicker">INDEX · FACETS</span>
            <h3 className="hx-facets-title">
              {translate('تصفية المراجع الإدارية', 'Management Facets')}
            </h3>
          </div>

          {hasAnyFilterActive && (
            <button type="button" onClick={onResetFilters} className="hx-linkbtn">
              <RotateCcw className="size-3" aria-hidden="true" />
              <span>{translate('إعادة تعيين', 'Reset')}</span>
            </button>
          )}
        </div>

        {/* Facet 1: Administrative Sciences Discipline */}
        <div className="hx-facet-group">
          <p className="hx-facet-label">
            {translate('الحقل الإداري والمعرفي', 'Management Discipline')}
          </p>
          <div className="hx-facet-list">
            {DISCIPLINE_FACETS.map((facet) => {
              const isSelected =
                activeIssuer === facet.id || activeIssuer === facet.keyword;
              const count = getDisciplineCount(facet);
              return (
                <button
                  key={facet.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectIssuer(isSelected ? '' : facet.id)}
                  className="hx-facet"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="hx-facet-mark" aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="leading-snug">
                      {lang === 'ar' ? facet.name : facet.nameEn}
                    </span>
                  </span>
                  <span className="hx-facet-n">{formatNumber(count)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 2: Publication Era & Decades */}
        <div className="hx-facet-group">
          <p className="hx-facet-label">
            {translate('الحقبة وتاريخ النشر', 'Publication Era')}
          </p>
          <div className="hx-facet-list">
            {ERA_FACETS.map((era) => {
              const isSelected = activeEra === era.id;
              const count = era.id === 'era_all' ? books.length : getEraCount(era.id);
              return (
                <button
                  key={era.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectEra(era.id)}
                  className="hx-facet"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="hx-facet-mark hx-facet-mark--radio"
                      aria-hidden="true"
                    />
                    <span className="leading-snug">
                      {lang === 'ar' ? era.label : era.labelEn}
                    </span>
                  </span>
                  <span className="hx-facet-n">{formatNumber(count)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 3: Content / Reference Type */}
        <div className="hx-facet-group">
          <p className="hx-facet-label">
            {translate('طبيعة المرجع والمحتوى', 'Reference Nature')}
          </p>
          <div className="hx-ftags">
            {TYPE_FACETS.map((type) => {
              const isSelected = activeType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectType(type.id)}
                  className="hx-ftag"
                >
                  {lang === 'ar' ? type.label : type.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Miniature Baghdadi Square Kufic Archival Colophon Stamp */}
        <div data-testid="sidebar-kufic-colophon" className="hx-facets-seal">
          <BaghdadiSquareKuficSeal size={44} surfaceFill="var(--canvas)" />
          <div className="min-w-0">
            <b className="truncate">
              {translate('الفهرس العراقي الموثق', 'Verified Iraqi Index')}
            </b>
            <small className="truncate">
              {translate(
                'ختم الضبط الببليوغرافي · بغداد',
                'Bibliographic Control Seal · Baghdad'
              )}
            </small>
          </div>
        </div>
      </div>
    </aside>
  );
}
