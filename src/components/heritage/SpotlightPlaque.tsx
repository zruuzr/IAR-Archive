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
 * "In the spotlight": a tilted cloth tome next to a museum-style plaque with a double
 * gilt border, spec table, key points and actions.
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
      className={cn('hx-section', 'hx-spot', className)}
      id={id}
      data-testid={dataTestId || testId}
      aria-labelledby={headingId}
    >
      {friezeTestId && <HeritageFrieze testId={friezeTestId} />}
      <div className="hx-wrap">
        <div className="hx-spot-grid">
          <div className="hx-tome">{cover}</div>
          <article className="hx-plaque" data-testid={cardTestId}>
            <p className="hx-eyebrow">
              <span>{eyebrow}</span>
              {badge ? <span className="hx-badge">{badge}</span> : null}
            </p>
            <h2 id={headingId}>{title}</h2>
            {author ? <p className="hx-auth">{author}</p> : null}
            {description ? <p className="hx-desc">{description}</p> : null}
            {specs && specs.length > 0 ? (
              <dl className="hx-specs">
                {specs.map((spec, index) => (
                  <div key={index}>
                    <dt>{spec.label}</dt>
                    <dd
                      {...(spec.ltr
                        ? { dir: 'ltr', style: { textAlign: 'end' as const } }
                        : {})}
                    >
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {points && points.length > 0 ? (
              <ul className="hx-points">
                {points.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : null}
            {audience ? (
              <p className="hx-aud">
                <b>{audience.label}</b> {audience.text}
              </p>
            ) : null}
            {actions ? <div className="hx-cta">{actions}</div> : null}
          </article>
        </div>
      </div>
    </section>
  );
}
