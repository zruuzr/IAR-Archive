import { ChevronDown, Filter, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { cn } from '@/lib/utils';
import {
  DISCIPLINE_FACETS,
  ERA_FACETS,
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
    return books.filter((b) => {
      const text = `${b.title} ${b.author} ${b.category} ${b.description}`.toLowerCase();
      return facet.keywords.some((k) => text.includes(k.toLowerCase()));
    }).length;
  };

  const getEraCount = (min: number, max: number): number => {
    return books.filter((b) => {
      const yr = parseInt(b.year, 10);
      if (isNaN(yr)) return false;
      return yr >= min && yr <= max;
    }).length;
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
          className="w-full flex items-center justify-between p-3.5 bg-card rounded-[4px] border hairline-border-strong doc-shadow font-semibold text-xs text-foreground cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="size-3.5 text-primary shrink-0" aria-hidden="true" />
            <span>
              {translate('تصفية وفهرسة المراجع الإدارية', 'Filter Management References')}
            </span>
            {hasAnyFilterActive && (
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold">
                {translate('نشط', 'ACTIVE')}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'size-4 transition-transform duration-200 text-muted-foreground',
              isMobileOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Main Architectural Index Facet Panel */}
      <div
        className={cn(
          'bg-card rounded-[4px] p-5 border hairline-border-strong doc-shadow transition-all',
          !isMobileOpen && 'hidden lg:block'
        )}
      >
        {/* Header & Reset Button */}
        <div className="flex items-center justify-between pb-3 border-b hairline-border mb-4">
          <div className="space-y-0.5">
            <span className="block font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
              INDEX · FACETS
            </span>
            <h3 className="font-serif font-bold text-base text-foreground flex items-center gap-2">
              <span>{translate('تصفية المراجع الإدارية', 'Management Facets')}</span>
            </h3>
          </div>

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors font-medium"
            >
              <RotateCcw className="size-3" />
              <span>{translate('إعادة تعيين', 'Reset')}</span>
            </button>
          )}
        </div>

        {/* Facet 1: Administrative Sciences Discipline */}
        <div className="space-y-2.5 mb-5">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] block">
            {translate('الحقل الإداري والمعرفي', 'Management Discipline')}
          </label>
          <div className="space-y-1 text-xs text-foreground/85">
            {DISCIPLINE_FACETS.map((facet) => {
              const isSelected = activeIssuer === facet.keyword;
              const count = getDisciplineCount(facet);
              return (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => onSelectIssuer(isSelected ? '' : facet.keyword)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-start transition-colors cursor-pointer border',
                    isSelected
                      ? 'border-primary/40 bg-primary/10 text-foreground font-semibold'
                      : 'border-transparent hover:bg-secondary/70'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-3.5 rounded-[2px] border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hairline-border-strong bg-background'
                      )}
                    >
                      {isSelected && <span className="text-[9px] leading-none">✓</span>}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? facet.name : facet.nameEn}
                    </span>
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px] tabular-nums shrink-0 ms-2">
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 2: Publication Era & Decades */}
        <div className="space-y-2.5 mb-5 pt-4 border-t hairline-border">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] block">
            {translate('الحقبة وتاريخ النشر', 'Publication Era')}
          </label>
          <div className="space-y-1 text-xs text-foreground/85">
            {ERA_FACETS.map((era) => {
              const isSelected = activeEra === era.id;
              const count =
                era.id === 'era_all' ? books.length : getEraCount(era.min, era.max);
              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => onSelectEra(era.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-start transition-colors cursor-pointer border',
                    isSelected
                      ? 'border-primary/40 bg-primary/10 text-foreground font-semibold'
                      : 'border-transparent hover:bg-secondary/70'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'hairline-border-strong bg-background'
                      )}
                    >
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-primary-foreground" />
                      )}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? era.label : era.labelEn}
                    </span>
                  </span>
                  <span className="text-muted-foreground font-mono text-[11px] tabular-nums shrink-0 ms-2">
                    {formatNumber(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 3: Content / Reference Type */}
        <div className="space-y-2.5 pt-4 border-t hairline-border">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em] block">
            {translate('طبيعة المرجع والمحتوى', 'Reference Nature')}
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {TYPE_FACETS.map((type) => {
              const isSelected = activeType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onSelectType(type.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-[3px] border text-xs font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'bg-background/70 text-foreground/85 hairline-border hover:bg-secondary'
                  )}
                >
                  {lang === 'ar' ? type.label : type.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
