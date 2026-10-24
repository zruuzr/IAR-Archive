import { Filter, RotateCcw } from 'lucide-react';
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
      className="space-y-6"
    >
      <div className="bg-white dark:bg-card rounded-2xl p-5 border border-slate-200 dark:border-border doc-shadow">
        {/* Header & Reset Button */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-border/70 mb-4">
          <h3 className="font-bold text-sm text-regal-900 dark:text-gold-400 flex items-center gap-2">
            <Filter className="size-4 text-gold-500 shrink-0" aria-hidden="true" />
            <span>{translate('تصفية المراجع الإدارية', 'Management Facets')}</span>
          </h3>

          {hasAnyFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-slate-500 hover:text-regal-800 dark:hover:text-gold-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>{translate('إعادة تعيين', 'Reset')}</span>
            </button>
          )}
        </div>

        {/* Facet 1: Administrative Sciences Discipline */}
        <div className="space-y-2.5 mb-5">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            {translate('الحقل الإداري والمعرفي', 'Management Discipline')}
          </label>
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {DISCIPLINE_FACETS.map((facet) => {
              const isSelected = activeIssuer === facet.keyword;
              const count = getDisciplineCount(facet);
              return (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => onSelectIssuer(isSelected ? '' : facet.keyword)}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-start transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-regal-100 text-regal-900 dark:bg-regal-900/60 dark:text-gold-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-3.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-regal-800 bg-regal-800 text-white dark:border-gold-500 dark:bg-gold-500 dark:text-slate-950'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      )}
                    >
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? facet.name : facet.nameEn}
                    </span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] tabular-nums shrink-0 ms-2">
                    ({formatNumber(count)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 2: Publication Era */}
        <div className="space-y-2.5 mb-5 pt-4 border-t border-slate-100 dark:border-border/70">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            {translate('الحقبة وتاريخ النشر', 'Publication Era')}
          </label>
          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {ERA_FACETS.map((era) => {
              const isSelected = activeEra === era.id;
              const count =
                era.id === 'era_all' ? books.length : getEraCount(era.min, era.max);
              return (
                <button
                  key={era.id}
                  type="button"
                  onClick={() =>
                    onSelectEra(isSelected && era.id !== 'era_all' ? 'era_all' : era.id)
                  }
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-start transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-regal-100 text-regal-900 dark:bg-regal-900/60 dark:text-gold-300 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'border-regal-800 bg-regal-800 text-white dark:border-gold-500 dark:bg-gold-500 dark:text-slate-950'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      )}
                    >
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-white dark:bg-slate-950" />
                      )}
                    </span>
                    <span className="truncate">
                      {lang === 'ar' ? era.label : era.labelEn}
                    </span>
                  </span>
                  <span className="text-slate-400 font-mono text-[11px] tabular-nums shrink-0 ms-2">
                    ({formatNumber(count)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facet 3: Document Content Type */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-border/70">
          <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            {translate('طبيعة المرجع والمحتوى', 'Reference Type')}
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {TYPE_FACETS.map((tf) => {
              const isSelected = activeType === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() =>
                    onSelectType(isSelected && tf.id !== 'type_all' ? 'type_all' : tf.id)
                  }
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-regal-800 text-white border-regal-800 dark:bg-gold-500 dark:text-slate-950 dark:border-gold-500 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {lang === 'ar' ? tf.label : tf.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
