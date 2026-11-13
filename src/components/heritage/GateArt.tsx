import { useId, type ReactNode } from 'react';

import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

/** Stepped Ishtar Mihrab upper monument ending in a flat structural sill at y = 356. */
const BODY_PATH = 'M20,356V118H52V88H92V58H168V28H312V58H388V88H428V118H460V356Z';
/** Wide pointed Baghdadi Mihrab sanctuary arch above the shelf lintel. */
const ARCH_PATH = 'M102,336V258C102,208 164,180 240,164C316,180 378,208 378,258V336Z';

const BAND_ROSETTES = Array.from({ length: 11 }, (_, i) => 60 + 36 * i);
const PLINTH_ROSETTES = Array.from({ length: 11 }, (_, i) => 20 + 40 * i);

/** Muqarnas (stalactite) cells filling the upper pointed Mihrab vault, row by row. */
const MUQARNAS_CELLS = (() => {
  const palette = ['#143f8f', '#0f7377'];
  const cells: {
    key: string;
    d: string;
    fill: string;
    opacity: number;
    strokeOpacity: number;
  }[] = [];
  for (let row = 0; row < 5; row += 1) {
    const y = 166 + row * 19;
    const offset = 15 * (row % 2);
    const opacity = Math.max(0.32, 0.96 - row * 0.13);
    for (let col = -1; col < 11; col += 1) {
      const x = 90 + col * 30 + offset;
      cells.push({
        key: `${row}-${col}`,
        d: `M${x},${y + 24}L${x},${y + 11}Q${x},${y + 3} ${x + 15},${y}Q${x + 30},${y + 3} ${x + 30},${y + 11}L${x + 30},${y + 24}Z`,
        fill: palette[(col + row + 2) % 2],
        opacity: Number(opacity.toFixed(2)),
        strokeOpacity: Number((opacity * 0.75).toFixed(2))
      });
    }
  }
  return cells;
})();

export interface GateArtProps {
  /** Bookshelf placed in the dedicated wide cabinet directly beneath the Mihrab. */
  children?: ReactNode;
  /** Accessible description of the artwork. */
  label?: string;
  className?: string;
}

/**
 * Two-tier Iraqi archival monument:
 * 1) Upper Tier: Ishtar ziggurat crown, rosette band, muqarnas Mihrab arch, and suspended Khatim sanctuary lamp.
 * 2) Lower Tier (flush below): Wide lapis-and-gold bookshelf cabinet with cedar ledge and rosette plinth
 *    giving book spines maximum clarity and readable scale.
 */
export function GateArt({
  children,
  label = 'محراب بوابة عشتار المضيء يرتكز تحته مباشرة رف كتب واسع بأشرطة وردات ذهبية',
  className
}: GateArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `hx-${uid}-${name}`;
  const star = (cx: number, cy: number, r: number, rot = 0) =>
    starPoints(cx, cy, r, r * OCTAGRAM_RATIO, 8, rot);

  return (
    <div className={['hx-gate-art', className].filter(Boolean).join(' ')}>
      {/* Upper Tier: Dedicated Mihrab Sanctuary */}
      <svg
        className="hx-gate-mihrab"
        viewBox="0 0 480 356"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
      >
        <defs>
          <g id={id('ros')}>
            <g fill="#e2b84e" stroke="#8d6618" strokeWidth=".6">
              {Array.from({ length: 12 }, (_, i) => (
                <ellipse
                  key={i}
                  cx="0"
                  cy="-8.6"
                  rx="3.5"
                  ry="7.4"
                  transform={`rotate(${30 * i})`}
                />
              ))}
            </g>
            <circle r="5.6" fill="#1d8a86" stroke="#0d2257" strokeWidth="1" />
            <circle r="2.2" fill="#f1d27a" />
          </g>
          <pattern id={id('brk')} width="54" height="36" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#040d29" strokeWidth="1.3" opacity=".6">
              <path d="M0 0H54M0 18H54M0 36H54" />
              <path d="M0 0V18M27 0V18M13.5 18V36M40.5 18V36" />
            </g>
            <g fill="none" stroke="#6b93ea" strokeWidth="1" opacity=".22">
              <path d="M0 1H54M0 19H54" />
            </g>
          </pattern>
          <pattern id={id('stp')} width="36" height="36" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#e2b84e" strokeWidth="1.05" opacity=".52">
              <polygon points={star(18, 18, 18)} />
              <polygon points={star(18, 18, 7.2, 22.5)} />
            </g>
          </pattern>
          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id('glow')} cx="50%" cy="62%" r="65%">
            <stop offset="0" stopColor="#fff1bf" stopOpacity=".58" />
            <stop offset=".38" stopColor="#e2b84e" stopOpacity=".24" />
            <stop offset="1" stopColor="#050d26" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('niche')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#050f2e" />
            <stop offset="1" stopColor="#0b1f50" />
          </linearGradient>
          <clipPath id={id('clip')}>
            <path d={ARCH_PATH} />
          </clipPath>
        </defs>

        {/* Body */}
        <path d={BODY_PATH} fill="#17399a" />
        <path d={BODY_PATH} fill={`url(#${id('brk')})`} />
        <path d={BODY_PATH} fill={`url(#${id('gloss')})`} />
        <path d={BODY_PATH} fill="none" stroke="#e2b84e" strokeWidth="3" />

        {/* Crown medallion */}
        <g transform="translate(240 68)">
          <polygon
            points={star(0, 0, 31)}
            fill="#0d2257"
            stroke="#e2b84e"
            strokeWidth="2.2"
          />
          <polygon
            points={star(0, 0, 19.5, 22.5)}
            fill="#1d8a86"
            stroke="#f1d27a"
            strokeWidth="1.4"
          />
          <circle r="6.5" fill="#f1d27a" />
          <circle r="2.8" fill="#0d2257" />
        </g>
        <g fill="#e2b84e">
          <polygon points={star(130, 80, 7.5)} />
          <polygon points={star(350, 80, 7.5)} />
          <polygon points={star(72, 102, 5.5)} />
          <polygon points={star(408, 102, 5.5)} />
        </g>

        {/* Rosette frieze band */}
        <rect x="20" y="112" width="440" height="42" fill="#0d2257" fillOpacity=".62" />
        <path d="M20 114H460M20 152H460" stroke="#e2b84e" strokeWidth="2.4" />
        <path d="M20 119H460M20 147H460" stroke="#e2b84e" strokeWidth=".8" opacity=".7" />
        {BAND_ROSETTES.map((x) => (
          <use
            key={x}
            href={`#${id('ros')}`}
            transform={`translate(${x} 133) scale(.76)`}
          />
        ))}

        {/* Slim flanking inlaid piers */}
        <rect
          x="30"
          y="164"
          width="54"
          height="164"
          fill={`url(#${id('stp')})`}
          stroke="#e2b84e"
          strokeWidth="1.4"
          strokeOpacity=".8"
        />
        <rect
          x="396"
          y="164"
          width="54"
          height="164"
          fill={`url(#${id('stp')})`}
          stroke="#e2b84e"
          strokeWidth="1.4"
          strokeOpacity=".8"
        />

        {/* Mihrab sanctuary interior with muqarnas & hanging khatim lamp */}
        <path d={ARCH_PATH} fill={`url(#${id('niche')})`} />
        <g clipPath={`url(#${id('clip')})`}>
          {MUQARNAS_CELLS.map((c) => (
            <path
              key={c.key}
              d={c.d}
              fill={c.fill}
              fillOpacity={c.opacity}
              stroke="#e2b84e"
              strokeOpacity={c.strokeOpacity}
              strokeWidth=".85"
            />
          ))}
          <rect
            x="92"
            y="246"
            width="296"
            height="92"
            fill={`url(#${id('niche')})`}
            opacity=".65"
          />
          <ellipse cx="240" cy="260" rx="130" ry="86" fill={`url(#${id('glow')})`} />

          {/* Hanging sanctuary medallion & brass chain */}
          <line x1="240" y1="168" x2="240" y2="232" stroke="#e2b84e" strokeWidth="1.8" />
          <circle cx="240" cy="190" r="2.2" fill="#f1d27a" />
          <circle cx="240" cy="206" r="2.2" fill="#f1d27a" />
          <circle cx="240" cy="222" r="2.2" fill="#f1d27a" />
          <g transform="translate(240 264)">
            <circle r="38" fill="#f1d27a" fillOpacity=".14" />
            <polygon
              points={star(0, 0, 30)}
              fill="#0d2257"
              stroke="#e2b84e"
              strokeWidth="2.1"
            />
            <polygon
              points={star(0, 0, 19, 22.5)}
              fill="#1d8a86"
              stroke="#f1d27a"
              strokeWidth="1.3"
            />
            <circle r="7.5" fill="#f7e29a" />
            <circle r="3" fill="#091a40" />
            <path d="M0 30V42" stroke="#e2b84e" strokeWidth="1.6" />
            <circle cx="0" cy="44" r="3" fill="#e2b84e" />
          </g>

          {/* Subtle lattice horizon strip */}
          <path d="M108 326H372" stroke="#e2b84e" strokeWidth="1" strokeOpacity=".42" />
        </g>

        {/* Ornate 5-layer Mihrab arch molding */}
        <path d={ARCH_PATH} fill="none" stroke="#06143a" strokeWidth="24" />
        <path d={ARCH_PATH} fill="none" stroke="#e2b84e" strokeWidth="17" />
        <path d={ARCH_PATH} fill="none" stroke="#17399a" strokeWidth="11.5" />
        <path d={ARCH_PATH} fill="none" stroke="#1d8a86" strokeWidth="6" />
        <path d={ARCH_PATH} fill="none" stroke="#f1d27a" strokeWidth="1.8" />

        {/* Carved Mihrab Sill & Transition Cornice separating/joining the shelf below */}
        <rect x="20" y="334" width="440" height="22" fill="#0d2257" />
        <rect x="102" y="330" width="276" height="6" fill="#2b190b" />
        <path d="M20 336H460" stroke="#e2b84e" strokeWidth="2.4" />
        <path d="M20 345H460" stroke="#e2b84e" strokeWidth=".9" opacity=".65" />
        <path d="M20 355H460" stroke="#e2b84e" strokeWidth="2.4" />
      </svg>

      {/* Lower Tier: Wide Bookshelf Cabinet Joined Flush Directly Below the Mihrab */}
      <div className="hx-shelf-cabinet">
        <div className="hx-shelf-stage">
          {children}
          <div className="hx-shelf-ledge" aria-hidden="true" />
        </div>
        <div className="hx-shelf-plinth" aria-hidden="true">
          <svg viewBox="0 0 440 36" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <g id={id('plinth-ros')}>
                <g fill="#e2b84e" stroke="#8d6618" strokeWidth=".6">
                  {Array.from({ length: 12 }, (_, i) => (
                    <ellipse
                      key={i}
                      cx="0"
                      cy="-8.6"
                      rx="3.5"
                      ry="7.4"
                      transform={`rotate(${30 * i})`}
                    />
                  ))}
                </g>
                <circle r="5.6" fill="#1d8a86" stroke="#0d2257" strokeWidth="1" />
                <circle r="2.2" fill="#f1d27a" />
              </g>
            </defs>
            {PLINTH_ROSETTES.map((x) => (
              <use
                key={x}
                href={`#${id('plinth-ros')}`}
                transform={`translate(${x} 18) scale(.56)`}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
