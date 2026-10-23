import {
  BookOpen,
  Calendar,
  Compass,
  Eye,
  Layers,
  Quote,
  Search,
  Sparkles
} from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export interface HeroAcademicProps {
  booksCount: number;
  categoriesCount: number;
  visitsCount: number | null;
  loaded: boolean;
  onOpenSpotlight?: () => void;
  onSelectKeyword?: (keyword: string) => void;
}

const TRENDING_KEYWORDS: readonly string[] = [
  'قانون',
  'الإدارة العامة',
  'التخطيط الاستراتيجي',
  'الرقابة المالية',
  'القيادة الإدارية'
] as const;

/**
 * Balanced academic editorial hero section ("Modern Bayt al-Hikma").
 * Displays the Sumerian cuneiform seal kicker, institutional headline,
 * prominent spotlight search prompt, trending topics, and strictly real catalog/metrics statistics.
 */
export function HeroAcademic({
  booksCount,
  categoriesCount,
  visitsCount,
  loaded,
  onOpenSpotlight,
  onSelectKeyword
}: HeroAcademicProps) {
  const { t, formatNumber } = useI18n();

  const formattedBooks = loaded ? formatNumber(booksCount) : '—';
  const formattedCategories = loaded ? formatNumber(categoriesCount) : '—';
  const formattedVisits =
    visitsCount !== null && Number.isFinite(visitsCount)
      ? formatNumber(visitsCount)
      : '—';

  return (
    <section
      aria-labelledby="txtAboutTitle"
      data-testid="hero-academic"
      className="relative overflow-hidden border-b border-border bg-mesopotamian-lattice bg-gradient-to-b from-secondary/40 via-background to-background"
    >
      {/* Subtle geometric editorial grid accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* Editorial Copy Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/35 bg-card/90 px-3.5 py-1 text-xs font-medium text-primary shadow-2xs backdrop-blur-xs">
              <span
                id="txtKicker"
                data-testid="hero-kicker"
                className="font-cuneiform tracking-wide"
              >
                {t('txtKicker')}
              </span>
            </div>

            <h1
              id="txtAboutTitle"
              data-testid="hero-title"
              className="hero-title font-bold tracking-tight text-foreground leading-[1.2] text-[clamp(1.75rem,3.4vw,2.85rem)]"
            >
              {t('txtAboutTitle')}
            </h1>

            <p
              id="txtAboutDesc"
              data-testid="hero-description"
              className="max-w-[66ch] text-sm sm:text-base text-muted-foreground leading-[1.8]"
            >
              {t('txtAboutDesc')}
            </p>

            {/* Central Spotlight Search Prompt */}
            {onOpenSpotlight && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenSpotlight}
                  data-testid="hero-spotlight-trigger"
                  className="group relative flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-primary/35 bg-card/95 px-4 py-3.5 text-start shadow-md shadow-primary/5 transition-all duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer"
                >
                  <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors min-w-0">
                    <Search className="size-4.5 text-primary shrink-0 transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium truncate">
                      {t('spotlightPlaceholder')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <kbd className="hidden sm:inline-flex items-center rounded-md border border-border bg-secondary/80 px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground shadow-2xs">
                      Ctrl + K
                    </kbd>
                  </div>
                </button>

                {/* Trending Topic Pills */}
                {onSelectKeyword && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {t('trendingTopics')}
                    </span>
                    {TRENDING_KEYWORDS.map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => onSelectKeyword(kw)}
                        className="rounded-full border border-border/80 bg-card/80 px-2.5 py-0.5 text-[11px] transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary cursor-pointer"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Editorial Capability Badges */}
            <div
              className="flex flex-wrap items-center gap-2 pt-1"
              aria-label="Capabilities"
            >
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 shadow-2xs">
                <Sparkles className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span id="txtTagSummary">{t('txtTagSummary')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 shadow-2xs">
                <Quote className="size-3.5 text-teal shrink-0" aria-hidden="true" />
                <span id="txtTagCite">{t('txtTagCite')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-foreground/90 shadow-2xs">
                <Layers className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span id="txtTagBundle">{t('txtTagBundle')}</span>
              </span>
            </div>
          </div>

          {/* Real Data Ledger / Stats Panel (Upgraded with golden luxury style) */}
          <div className="lg:col-span-5">
            <dl
              data-testid="hero-stats-ledger"
              className="hero-stats grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 rounded-2xl border border-primary/25 bg-card/95 p-4 sm:p-5 shadow-lg shadow-primary/5 backdrop-blur-xs"
            >
              <div className="group flex flex-col justify-between rounded-xl border border-border/70 bg-background/70 p-3.5 transition-all duration-300 hover:border-primary/45 hover:bg-background">
                <dt
                  id="txtStatBooks"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BookOpen className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{t('txtStatBooks')}</span>
                </dt>
                <dd
                  id="booksCounter"
                  data-testid="stat-total-books"
                  className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground group-hover:text-primary transition-colors"
                >
                  {formattedBooks}
                </dd>
              </div>

              <div className="group flex flex-col justify-between rounded-xl border border-border/70 bg-background/70 p-3.5 transition-all duration-300 hover:border-teal/45 hover:bg-background">
                <dt
                  id="txtStatCats"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-teal/10 text-teal">
                    <Compass className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{t('txtStatCats')}</span>
                </dt>
                <dd
                  id="catCounter"
                  data-testid="stat-total-categories"
                  className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground group-hover:text-teal transition-colors"
                >
                  {formattedCategories}
                </dd>
              </div>

              <div className="group flex flex-col justify-between rounded-xl border border-border/70 bg-background/70 p-3.5 transition-all duration-300 hover:border-primary/45 hover:bg-background">
                <dt
                  id="txtStatVisits"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Eye className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{t('txtStatVisits')}</span>
                </dt>
                <dd
                  id="visitsCounter"
                  data-testid="stat-visits-count"
                  className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-foreground group-hover:text-primary transition-colors"
                >
                  {formattedVisits}
                </dd>
              </div>

              <div className="group flex flex-col justify-between rounded-xl border border-border/70 bg-background/70 p-3.5 transition-all duration-300 hover:border-primary/45 hover:bg-background">
                <dt
                  id="txtStatYear"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Calendar className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="truncate">{t('txtStatYear')}</span>
                </dt>
                <dd
                  data-testid="stat-archive-year"
                  className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-primary"
                >
                  2026
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
