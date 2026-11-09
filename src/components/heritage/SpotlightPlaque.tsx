import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { HeritageFrieze } from './ornaments';

export interface SpotlightSpec {
  label: ReactNode;
  value: ReactNode;
  /** Render the value left-to-right (file sizes, ISBN…). */
  ltr?: boolean;
}

export interface SpotlightPlaqueProps {
  /** Usually `<HeritageBookCover … titleAs="span" />` or a real cover image. */
  cover: ReactNode;
  eyebrow: ReactNode;
  badge?: ReactNode;
  title: ReactNode;
  author?: ReactNode;
  description?: ReactNode;
  specs?: readonly SpotlightSpec[];
  points?: readonly ReactNode[];
  audience?: { label: ReactNode; text: ReactNode };
  /** Primary reading and download CTAs placed under the book vitrine. */
  primaryActions?: ReactNode;
  /** Buttons: `HeritageButton variant="gold"` (primary) and `variant="ghost"` (secondary). */
  actions?: ReactNode;
  id?: string;
  headingId?: string;
  className?: string;
  testId?: string;
  'data-testid'?: string;
  cardTestId?: string;
  friezeTestId?: string;
}

/**
 * Editorial "In the Spotlight" featured monograph exhibition plaque.
 * Architecturally structured with a balanced vitrine column on one side
 * and an academic monograph overview plate on the other.
 */
export function SpotlightPlaque({
  cover,
  eyebrow,
  badge,
  title,
  author,
  description,
  specs,
  points,
  audience,
  primaryActions,
  actions,
  id,
  headingId = 'hx-spotlight-title',
  className,
  testId,
  'data-testid': dataTestId,
  cardTestId,
  friezeTestId
}: SpotlightPlaqueProps) {
  return (
    <section
      className={cn(
        'hx-spot rounded-2xl border border-[var(--hx-line)] bg-[var(--hx-surface)] overflow-hidden shadow-sm transition-shadow hover:shadow-md',
        className
      )}
      id={id}
      data-testid={dataTestId || testId}
      aria-labelledby={headingId}
    >
      {friezeTestId && <HeritageFrieze testId={friezeTestId} />}

      <div className="p-4 sm:p-6 lg:p-7 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-6 lg:gap-8 items-start">
          {/* Vitrine / Cover Showcase Stand */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--hx-surface-2)]/50 border border-[var(--hx-line)]/70 text-center">
            <div className="hx-tome flex justify-center mb-3">{cover}</div>

            {/* Quick Specs summary under cover */}
            {specs && specs.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3 w-full">
                {specs.map((spec, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--hx-surface)] border border-[var(--hx-line)] text-foreground/80"
                  >
                    <span className="text-[var(--hx-gold)] text-[10px]">•</span>
                    <span className="opacity-75">{spec.label}:</span>
                    <strong
                      className="font-semibold text-foreground"
                      {...(spec.ltr ? { dir: 'ltr' } : {})}
                    >
                      {spec.value}
                    </strong>
                  </span>
                ))}
              </div>
            ) : null}

            {/* Primary Action Buttons (Read + Download) under the book */}
            {primaryActions && (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full mt-1">
                {primaryActions}
              </div>
            )}
          </div>

          {/* Academic Monograph Editorial Plate */}
          <article
            className="hx-plaque flex flex-col justify-between h-full bg-transparent border-0 p-0 shadow-none before:hidden"
            data-testid={cardTestId}
          >
            <div>
              {/* Eyebrow & Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-[var(--hx-accent-text)] uppercase tracking-wider">
                  {eyebrow}
                </span>
                {badge ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--hx-lapis-night)] text-[var(--hx-gold-pale)] border border-[var(--hx-gold)]/60">
                    {badge}
                  </span>
                ) : null}
              </div>

              {/* Monograph Title */}
              <h2
                id={headingId}
                className="text-2xl sm:text-3xl font-serif font-bold text-foreground leading-snug mb-1.5"
              >
                {title}
              </h2>

              {/* Author Attribution */}
              {author ? (
                <p className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-1.5">
                  <span className="text-[var(--hx-gold)]">✍</span>
                  <span>{author}</span>
                </p>
              ) : null}

              {/* Curated Description / Synopsis */}
              {description ? (
                <div className="border-s-2 border-[var(--hx-gold)] ps-3.5 py-1 my-3 text-xs sm:text-sm text-foreground/85 leading-relaxed bg-[var(--hx-surface-2)]/30 rounded-e">
                  {description}
                </div>
              ) : null}

              {/* Thematic Highlights / Key Pillars (2-column grid) */}
              {points && points.length > 0 ? (
                <div className="my-3.5">
                  <p className="text-xs font-bold text-[var(--hx-gold)] mb-2 flex items-center gap-1.5">
                    <span>✦</span>
                    <span>أبرز محاور وأركان المرجع:</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {points.map((point, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 rounded-md bg-[var(--hx-surface-2)]/60 border border-[var(--hx-line)]/70 text-xs text-foreground/90 leading-relaxed"
                      >
                        <span className="text-[var(--hx-gold)] shrink-0 font-bold mt-0.5">
                          ✓
                        </span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Target Audience */}
              {audience ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-[var(--hx-surface-2)]/40 px-3 py-1.5 rounded-md border border-[var(--hx-line)]/50 my-2">
                  <b className="text-foreground font-semibold">{audience.label}</b>{' '}
                  <span>{audience.text}</span>
                </p>
              ) : null}
            </div>

            {/* Research & Utility Actions Toolbar */}
            {actions ? (
              <div className="hx-cta mt-4 pt-3 border-t border-[var(--hx-line)]/60 flex flex-wrap items-center gap-2">
                {actions}
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  );
}
