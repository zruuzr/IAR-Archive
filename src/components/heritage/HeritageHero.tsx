import { useState, type CSSProperties, type ReactNode } from 'react';

import { CuneiformSeal } from './CuneiformSeal';
import { GateArt } from './GateArt';
import { SUMER_SIGNS } from './seal-signs';
import { HeritageButton, HeritageSteps } from './ornaments';

export interface HeritageSpine {
  id: string | number;
  /** Short title printed on the spine. */
  short: string;
  /** Full title shown on the placard. */
  title: string;
  author?: string;
  year?: string | number;
  pages?: string | number;
  /** Cloth colour (any CSS colour). */
  color: string;
  /** Use dark text (for light cloth such as ochre/gold). */
  light?: boolean;
  /** Spine height as a percentage of the shelf (default 90). */
  height?: number;
  coverImage?: string;
}

export interface HeritageHeroAction {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface HeritageHeroProps {
  /** Text next to the cuneiform signs, e.g. "المكتبة الرقمية العراقية · 2026". */
  kicker: ReactNode;
  /** Cuneiform signs before the kicker (default: KI-EN-GI, "Sumer"). */
  kickerSigns?: string;
  /** First title line(s). */
  title: ReactNode;
  /** Gold, underlined last part of the title. */
  titleEmphasis: ReactNode;
  lead: ReactNode;
  tags?: readonly string[];
  primaryAction: HeritageHeroAction;
  secondaryAction?: HeritageHeroAction & { hint?: ReactNode };
  stats: readonly { value: ReactNode; label: ReactNode }[];
  spines: readonly HeritageSpine[];
  /** Placard text before any spine is hovered/focused. */
  placardIdle?: { title: ReactNode; text: ReactNode };
  /** Second line of the placard for a spine. */
  placardMeta?: (spine: HeritageSpine) => ReactNode;
  spinesLabel?: string;
  gateLabel?: string;
  onSpineSelect?: (spine: HeritageSpine) => void;
  headingId?: string;
}

function defaultMeta(spine: HeritageSpine): string {
  return [spine.author, spine.year, spine.pages ? `${spine.pages}` : null]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Hero: dark lapis panel, headline + stats on one side, the gate with a shelf of
 * book spines on the other (hover/focus a spine to read its museum placard),
 * then the cuneiform cylinder-seal bands and a ziggurat edge.
 */
export function HeritageHero({
  kicker,
  kickerSigns = SUMER_SIGNS,
  title,
  titleEmphasis,
  lead,
  tags,
  primaryAction,
  secondaryAction,
  stats,
  spines,
  placardIdle,
  placardMeta = defaultMeta,
  spinesLabel = 'رفّ المراجع المميزة',
  gateLabel,
  onSpineSelect,
  headingId = 'hx-hero-title',
  children
}: HeritageHeroProps & { children?: ReactNode }) {
  const [active, setActive] = useState<HeritageSpine | null>(spines[0] ?? null);

  const select = (spine: HeritageSpine) => {
    setActive(spine);
    onSpineSelect?.(spine);
  };

  return (
    <div className="hx-hero-end">
      <section
        data-testid="hero-academic"
        className="hx-hero"
        aria-labelledby={headingId}
        style={{ paddingBottom: 0 }}
      >
        <div className="hx-wrap hx-hero-grid">
          <div className="hx-hero-copy">
            <p className="hx-kicker" data-testid="hero-kicker">
              <span className="hx-cune" aria-hidden="true">
                {kickerSigns}
              </span>
              <span>{kicker}</span>
            </p>
            <h1 id={headingId} data-testid="hero-title">
              {title}
              <br />
              <em>{titleEmphasis}</em>
            </h1>
            <p className="hx-lead" data-testid="hero-description">
              {lead}
            </p>
            {tags && tags.length > 0 ? (
              <ul className="hx-tags">
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            ) : null}
            <div className="hx-cta">
              {primaryAction.href ? (
                <a
                  className="hx-btn hx-btn-gold"
                  href={primaryAction.href}
                  onClick={primaryAction.onClick}
                >
                  {primaryAction.label}
                </a>
              ) : (
                <HeritageButton variant="gold" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </HeritageButton>
              )}
              {secondaryAction ? (
                <HeritageButton
                  variant="ghost"
                  onClick={secondaryAction.onClick}
                  data-testid="hero-spotlight-trigger"
                >
                  {secondaryAction.label}
                  {secondaryAction.hint ? <kbd>{secondaryAction.hint}</kbd> : null}
                </HeritageButton>
              ) : null}
            </div>
            <dl className="hx-stats">
              {stats.map((stat, index) => (
                <div key={index}>
                  <dd
                    data-testid={
                      index === 0
                        ? 'stat-total-books'
                        : index === 1
                          ? 'stat-total-categories'
                          : index === 3
                            ? 'stat-archive-year'
                            : undefined
                    }
                  >
                    {stat.value}
                  </dd>
                  <dt>{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <figure className="hx-gate" style={{ margin: 0 }}>
            <GateArt label={gateLabel}>
              <div
                className="hx-shelf"
                data-testid="editorial-cloth-shelf"
                role="group"
                aria-label={spinesLabel}
              >
                {spines.map((spine) => (
                  <button
                    key={spine.id}
                    type="button"
                    data-testid={`shelf-book-${spine.id}`}
                    aria-selected={active?.id === spine.id}
                    className={[
                      'hx-spine',
                      spine.light ? 'hx-spine-light' : '',
                      active?.id === spine.id ? 'hx-is-on' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      {
                        '--hx-c': spine.color,
                        '--hx-h': `${spine.height ?? 90}%`
                      } as CSSProperties
                    }
                    aria-label={spine.title}
                    onMouseEnter={() => select(spine)}
                    onFocus={() => select(spine)}
                    onClick={() => {
                      select(spine);
                      onSpineSelect?.(spine);
                    }}
                  >
                    <span>{spine.short}</span>
                    <img
                      src={spine.coverImage || `/covers/${spine.id}.jpg`}
                      alt={spine.title}
                      data-testid={`shelf-cover-img-${spine.id}`}
                      className="sr-only"
                    />
                  </button>
                ))}
              </div>
            </GateArt>
            <figcaption
              className="hx-placard"
              data-testid="shelf-placard"
              aria-live="polite"
            >
              {active ? (
                <>
                  <b>{active.title}</b>
                  <span>{placardMeta(active)}</span>
                </>
              ) : placardIdle ? (
                <>
                  <b>{placardIdle.title}</b>
                  <span>{placardIdle.text}</span>
                </>
              ) : null}
            </figcaption>
          </figure>
        </div>

        {children}

        <CuneiformSeal />
      </section>
      <HeritageSteps />
    </div>
  );
}
