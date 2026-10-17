import { BookOpen, Compass, Layers, Quote, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/I18nProvider';

export interface HeroAcademicProps {
  booksCount: number;
  categoriesCount: number;
  visitsCount: number | null;
  loaded: boolean;
}

/**
 * Balanced academic editorial hero section ("Modern Bayt al-Hikma").
 * Displays the Sumerian cuneiform seal kicker, institutional headline,
 * core archival capabilities, and strictly real catalog/metrics statistics.
 */
export function HeroAcademic({
  booksCount,
  categoriesCount,
  visitsCount,
  loaded
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
      className="relative border-b border-border bg-gradient-to-b from-secondary/55 via-background to-background"
    >
      {/* Subtle geometric editorial grid accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="mx-auto max-w-[1360px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-11">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
          {/* Editorial Copy Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card/90 px-3 py-1 text-xs font-medium text-primary shadow-2xs">
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
              className="hero-title font-bold tracking-tight text-foreground leading-[1.2] text-[clamp(1.65rem,3.1vw,2.65rem)]"
            >
              {t('txtAboutTitle')}
            </h1>

            <p
              id="txtAboutDesc"
              data-testid="hero-description"
              className="max-w-[66ch] text-sm sm:text-base text-muted-foreground leading-[1.75]"
            >
              {t('txtAboutDesc')}
            </p>

            {/* Editorial Capability Badges */}
            <div
              className="flex flex-wrap items-center gap-2 pt-1"
              aria-label="Capabilities"
            >
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90">
                <Sparkles className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span id="txtTagSummary">{t('txtTagSummary')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90">
                <Quote className="size-3.5 text-teal shrink-0" aria-hidden="true" />
                <span id="txtTagCite">{t('txtTagCite')}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/90">
                <Layers className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                <span id="txtTagBundle">{t('txtTagBundle')}</span>
              </span>
            </div>
          </div>

          {/* Real Data Ledger / Stats Panel */}
          <div className="lg:col-span-5">
            <dl
              data-testid="hero-stats-ledger"
              className="hero-stats grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 sm:gap-3 rounded-xl border border-border bg-card/95 p-3.5 sm:p-4 shadow-2xs"
            >
              <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-3">
                <dt
                  id="txtStatBooks"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <BookOpen
                    className="size-3.5 text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{t('txtStatBooks')}</span>
                </dt>
                <dd
                  id="booksCounter"
                  data-testid="stat-total-books"
                  className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums text-foreground"
                >
                  {formattedBooks}
                </dd>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-3">
                <dt
                  id="txtStatCats"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <Compass className="size-3.5 text-teal shrink-0" aria-hidden="true" />
                  <span className="truncate">{t('txtStatCats')}</span>
                </dt>
                <dd
                  id="catCounter"
                  data-testid="stat-total-categories"
                  className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums text-foreground"
                >
                  {formattedCategories}
                </dd>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-3">
                <dt
                  id="txtStatVisits"
                  className="text-[11px] font-medium text-muted-foreground truncate"
                >
                  {t('txtStatVisits')}
                </dt>
                <dd
                  id="visitsCounter"
                  data-testid="stat-visits-count"
                  className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums text-foreground"
                >
                  {formattedVisits}
                </dd>
              </div>

              <div className="flex flex-col justify-between rounded-lg border border-border/60 bg-background/60 p-3">
                <dt
                  id="txtStatYear"
                  className="text-[11px] font-medium text-muted-foreground truncate"
                >
                  {t('txtStatYear')}
                </dt>
                <dd
                  data-testid="stat-archive-year"
                  className="mt-1.5 text-xl sm:text-2xl font-bold tabular-nums text-primary"
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
