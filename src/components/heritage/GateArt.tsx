import { useId, type ReactNode } from 'react';

import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

/** Stepped Ishtar Mihrab upper monument ending in a flat structural sill at y = 360. */
const BODY_PATH = 'M20,360V116H52V86H92V56H168V26H312V56H388V86H428V116H460V360Z';

/** Graceful pointed Baghdadi arch with tall balanced proportions. */
const ARCH_PATH = 'M98,338V244C98,192 162,162 240,146C318,162 382,192 382,244V338Z';

/** Inner scalloped/cusped sanctuary arch line. */
const INNER_ARCH_PATH =
  'M112,336V246C112,201 169,174 240,159C311,174 368,201 368,246V336';

const BAND_ROSETTES = Array.from({ length: 11 }, (_, i) => 60 + 36 * i);
const PLINTH_ROSETTES = Array.from({ length: 11 }, (_, i) => 24 + 39.2 * i);

/** Muqarnas (stalactite) cells filling the pointed Mihrab vault smoothly. */
const MUQARNAS_CELLS = (() => {
  const palette = ['#164499', '#117a7e', '#103478'];
  const cells: {
    key: string;
    d: string;
    fill: string;
    opacity: number;
    strokeOpacity: number;
  }[] = [];
  for (let row = 0; row < 6; row += 1) {
    const y = 148 + row * 19;
    const offset = 14 * (row % 2);
    const opacity = Math.max(0.22, 0.92 - row * 0.13);
    for (let col = -1; col < 11; col += 1) {
      const x = 92 + col * 28 + offset;
      cells.push({
        key: `${row}-${col}`,
        d: `M${x},${y + 23}L${x},${y + 10}Q${x},${y + 3} ${x + 14},${y}Q${x + 28},${y + 3} ${x + 28},${y + 10}L${x + 28},${y + 23}Z`,
        fill: palette[(col + row + 3) % palette.length],
        opacity: Number(opacity.toFixed(2)),
        strokeOpacity: Number((opacity * 0.72).toFixed(2))
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
 * Unified Abbasid Muqarnas Sanctuary & Colonnette Treasury:
 * 1) Upper Tier: Stepped Ishtar ziggurat crown with crenellations, glazed rosette frieze,
 *    spandrel medallions, smooth muqarnas vault, suspended Khatim sanctuary lamp, and sculpted gilt colonnettes.
 * 2) Lower Tier (flush below): Gilt star-studded entablature and colonnette-framed bookshelf cabinet
 *    with aged cedar ledge and rosette plinth.
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
      {/* Upper Mihrab Monument SVG */}
      <svg
        className="hx-gate-mihrab"
        viewBox="0 0 480 360"
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
                  cy="-8.4"
                  rx="3.3"
                  ry="7.1"
                  transform={`rotate(${30 * i})`}
                />
              ))}
            </g>
            <circle r="5.4" fill="#1d8a86" stroke="#0d2257" strokeWidth="1" />
            <circle r="2.2" fill="#f7e29a" />
          </g>

          <pattern id={id('brk')} width="48" height="32" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#040d29" strokeWidth="1.2" opacity=".56">
              <path d="M0 0H48M0 16H48M0 32H48" />
              <path d="M0 0V16M24 0V16M12 16V32M36 16V32" />
            </g>
            <g fill="none" stroke="#7aa2f7" strokeWidth=".9" opacity=".2">
              <path d="M0 1H48M0 17H48" />
            </g>
          </pattern>

          <pattern id={id('stp')} width="34" height="34" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#e2b84e" strokeWidth="1" opacity=".52">
              <polygon points={star(17, 17, 16)} />
              <polygon points={star(17, 17, 6.8, 22.5)} />
            </g>
          </pattern>

          <linearGradient id={id('body-grad')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c43b0" />
            <stop offset=".55" stopColor="#15358e" />
            <stop offset="1" stopColor="#0f276e" />
          </linearGradient>

          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".16" />
            <stop offset=".5" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={id('glow')} cx="50%" cy="56%" r="62%">
            <stop offset="0" stopColor="#fff3c4" stopOpacity=".64" />
            <stop offset=".36" stopColor="#e2b84e" stopOpacity=".24" />
            <stop offset=".75" stopColor="#143a82" stopOpacity=".08" />
            <stop offset="1" stopColor="#050d26" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={id('niche')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#040c24" />
            <stop offset=".45" stopColor="#081842" />
            <stop offset="1" stopColor="#0b2156" />
          </linearGradient>

          <linearGradient id={id('gold-v')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7e29a" />
            <stop offset=".5" stopColor="#e2b84e" />
            <stop offset="1" stopColor="#b58322" />
          </linearGradient>

          <clipPath id={id('clip')}>
            <path d={ARCH_PATH} />
          </clipPath>
        </defs>

        {/* Outer Stepped Babylonian Ziggurat Body */}
        <path d={BODY_PATH} fill={`url(#${id('body-grad')})`} />
        <path d={BODY_PATH} fill={`url(#${id('brk')})`} />
        <path d={BODY_PATH} fill={`url(#${id('gloss')})`} />
        <path d={BODY_PATH} fill="none" stroke="#e2b84e" strokeWidth="3" />
        {/* Inner gilt hairline following stepped crown */}
        <path
          d="M25,356V121H57V91H97V61H173V31H307V61H383V91H423V121H455V356"
          fill="none"
          stroke="#f1d27a"
          strokeWidth=".9"
          strokeOpacity=".48"
        />

        {/* Stepped Merlon Crenellations along the Ziggurat Crown */}
        <g fill="#e2b84e" opacity=".88">
          {[184, 206, 228, 252, 274, 296].map((mx) => (
            <rect key={mx} x={mx - 4} y="20" width="8" height="5" rx="1" />
          ))}
        </g>

        {/* Royal Crown Octagram Medallion */}
        <g transform="translate(240 66)">
          <circle
            r="34"
            fill="#08163b"
            stroke="#e2b84e"
            strokeWidth="1.2"
            opacity=".85"
          />
          <polygon
            points={star(0, 0, 29)}
            fill="#0d2257"
            stroke="#e2b84e"
            strokeWidth="2"
          />
          <polygon
            points={star(0, 0, 18.5, 22.5)}
            fill="#1d8a86"
            stroke="#f7e29a"
            strokeWidth="1.3"
          />
          <circle r="6.2" fill="#f7e29a" />
          <circle r="2.6" fill="#0d2257" />
        </g>

        {/* Flanking Crown Stars */}
        <g fill="#e2b84e">
          <polygon points={star(130, 76, 8)} />
          <polygon points={star(350, 76, 8)} />
          <polygon points={star(72, 100, 6)} />
          <polygon points={star(408, 100, 6)} />
        </g>

        {/* Babylonian Glazed Rosette Frieze Band */}
        <rect x="21.5" y="108" width="437" height="36" fill="#0a1b46" fillOpacity=".78" />
        <path d="M20 108H460M20 144H460" stroke="#e2b84e" strokeWidth="2.2" />
        <path
          d="M20 112.5H460M20 139.5H460"
          stroke="#f1d27a"
          strokeWidth=".75"
          opacity=".68"
        />
        {BAND_ROSETTES.map((x) => (
          <use
            key={x}
            href={`#${id('ros')}`}
            transform={`translate(${x} 126) scale(.72)`}
          />
        ))}

        {/* Spandrel Arabesque Medallions in Upper Arch Corners */}
        <g transform="translate(124 170)">
          <circle r="13" fill="#0a1c48" stroke="#e2b84e" strokeWidth="1.2" />
          <polygon
            points={star(0, 0, 9.5)}
            fill="#1d8a86"
            stroke="#f1d27a"
            strokeWidth=".8"
          />
          <circle r="2.5" fill="#f7e29a" />
        </g>
        <g transform="translate(356 170)">
          <circle r="13" fill="#0a1c48" stroke="#e2b84e" strokeWidth="1.2" />
          <polygon
            points={star(0, 0, 9.5)}
            fill="#1d8a86"
            stroke="#f1d27a"
            strokeWidth=".8"
          />
          <circle r="2.5" fill="#f7e29a" />
        </g>

        {/* Classic Babylonian Star-Pattern Flanking Piers */}
        <g>
          <rect
            x="32"
            y="154"
            width="50"
            height="176"
            rx="2"
            fill="#0a1c48"
            stroke="#e2b84e"
            strokeWidth="1.5"
          />
          <rect
            x="32"
            y="154"
            width="50"
            height="176"
            rx="2"
            fill={`url(#${id('stp')})`}
          />
          <rect
            x="398"
            y="154"
            width="50"
            height="176"
            rx="2"
            fill="#0a1c48"
            stroke="#e2b84e"
            strokeWidth="1.5"
          />
          <rect
            x="398"
            y="154"
            width="50"
            height="176"
            rx="2"
            fill={`url(#${id('stp')})`}
          />
        </g>

        {/* Mihrab Sanctuary Interior */}
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
            x="94"
            y="144"
            width="292"
            height="196"
            fill={`url(#${id('niche')})`}
            opacity=".38"
          />

          <ellipse cx="240" cy="256" rx="134" ry="92" fill={`url(#${id('glow')})`} />

          <path
            d={INNER_ARCH_PATH}
            fill="none"
            stroke="#f1d27a"
            strokeWidth="1.1"
            strokeDasharray="4 3"
            opacity=".55"
          />

          <g opacity=".36" stroke="#e2b84e" strokeWidth="1" fill="none">
            <path d="M112 324H368" />
            <path d="M112 328H368" strokeWidth=".5" />
          </g>

          {/* Hanging Abbasid Khatim Sanctuary Lamp & Finial */}
          <line x1="240" y1="150" x2="240" y2="220" stroke="#f1d27a" strokeWidth="1.8" />
          <circle cx="240" cy="174" r="2.4" fill="#f7e29a" />
          <circle
            cx="240"
            cy="194"
            r="3"
            fill="#1d8a86"
            stroke="#f7e29a"
            strokeWidth=".9"
          />
          <circle cx="240" cy="212" r="2.2" fill="#f7e29a" />

          <g transform="translate(240 256)">
            <circle r="42" fill="#f1d27a" fillOpacity=".12" />
            <circle
              r="33"
              fill="none"
              stroke="#f1d27a"
              strokeWidth=".9"
              strokeDasharray="3 3"
              opacity=".65"
            />
            <polygon
              points={star(0, 0, 29)}
              fill="#0b1f52"
              stroke="#e2b84e"
              strokeWidth="2.1"
            />
            <polygon
              points={star(0, 0, 19, 22.5)}
              fill="#1d8a86"
              stroke="#f7e29a"
              strokeWidth="1.35"
            />
            <polygon
              points={star(0, 0, 10.5)}
              fill="#0d2257"
              stroke="#e2b84e"
              strokeWidth="1"
            />
            <circle r="4.8" fill="#f7e29a" />
            <circle r="2" fill="#091a40" />
            <path
              d="M0,29 L4,36 L0,43 L-4,36 Z"
              fill="#e2b84e"
              stroke="#091a40"
              strokeWidth=".8"
            />
          </g>
        </g>

        {/* Ornate 5-Layer Pointed Mihrab Arch Molding */}
        <path d={ARCH_PATH} fill="none" stroke="#06143a" strokeWidth="20" />
        <path d={ARCH_PATH} fill="none" stroke="#e2b84e" strokeWidth="14.5" />
        <path d={ARCH_PATH} fill="none" stroke="#17399a" strokeWidth="9.5" />
        <path d={ARCH_PATH} fill="none" stroke="#1d8a86" strokeWidth="4.8" />
        <path d={ARCH_PATH} fill="none" stroke="#f7e29a" strokeWidth="1.6" />

        {/* Carved Mihrab Colonnettes (Capitals, Shafts & Bases flanking the Arch) */}
        {[98, 382].map((cx) => (
          <g key={cx}>
            <path
              d={`M${cx - 9},238 H${cx + 9} L${cx + 6},248 H${cx - 6} Z`}
              fill={`url(#${id('gold-v')})`}
              stroke="#06143a"
              strokeWidth="1"
            />
            <rect
              x={cx - 4.5}
              y="248"
              width="9"
              height="78"
              fill={`url(#${id('gold-v')})`}
              stroke="#06143a"
              strokeWidth="1"
            />
            <line
              x1={cx}
              y1="250"
              x2={cx}
              y2="324"
              stroke="#0d2257"
              strokeWidth="1.2"
              opacity=".55"
            />
            <path
              d={`M${cx - 7},326 H${cx + 7} L${cx + 10},336 H${cx - 10} Z`}
              fill={`url(#${id('gold-v')})`}
              stroke="#06143a"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Ornate Gilt Entablature with Star Studs Joining the Bookshelf Below */}
        <g>
          <rect x="20" y="336" width="440" height="24" fill="#0b1e4d" />
          <path d="M20 336H460" stroke="#e2b84e" strokeWidth="2.5" />
          <path d="M28 341H452" stroke="#f1d27a" strokeWidth=".8" opacity=".62" />
          <path d="M28 355H452" stroke="#f1d27a" strokeWidth=".8" opacity=".62" />
          <path d="M20 359H460" stroke="#e2b84e" strokeWidth="2.2" />
          {[60, 120, 180, 240, 300, 360, 420].map((sx) => (
            <polygon
              key={sx}
              points={star(sx, 348, sx === 240 ? 6.5 : 4.8)}
              fill={sx === 240 ? '#f7e29a' : '#e2b84e'}
            />
          ))}
        </g>
      </svg>

      {/* Lower Tier: Interactive Bookshelf Sanctuary Cabinet */}
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
                      cy="-8.4"
                      rx="3.3"
                      ry="7.1"
                      transform={`rotate(${30 * i})`}
                    />
                  ))}
                </g>
                <circle r="5.4" fill="#1d8a86" stroke="#0d2257" strokeWidth="1" />
                <circle r="2.2" fill="#f7e29a" />
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
