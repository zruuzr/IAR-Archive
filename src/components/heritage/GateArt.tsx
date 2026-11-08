import { useId, type ReactNode } from 'react';

import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

const BODY_PATH = 'M20,620V150H52V118H92V86H168V54H312V86H388V118H428V150H460V620Z';
const ARCH_PATH = 'M120,570V360C120,285 170,240 240,208C310,240 360,285 360,360V570Z';

const BAND_ROSETTES = Array.from({ length: 11 }, (_, i) => 60 + 36 * i);
const PLINTH_ROSETTES = Array.from({ length: 11 }, (_, i) => 40 + 40 * i);

/** Muqarnas (stalactite) cells filling the hood of the niche, row by row. */
const MUQARNAS_CELLS = (() => {
  const palette = ['#143f8f', '#0f7377'];
  const cells: {
    key: string;
    d: string;
    fill: string;
    opacity: number;
    strokeOpacity: number;
  }[] = [];
  for (let row = 0; row < 7; row += 1) {
    const y = 214 + row * 21;
    const offset = 15 * (row % 2);
    const opacity = Math.max(0.32, 0.96 - row * 0.1);
    for (let col = -1; col < 10; col += 1) {
      const x = 106 + col * 30 + offset;
      cells.push({
        key: `${row}-${col}`,
        d: `M${x},${y + 27}L${x},${y + 12}Q${x},${y + 4} ${x + 15},${y}Q${x + 30},${y + 4} ${x + 30},${y + 12}L${x + 30},${y + 27}Z`,
        fill: palette[(col + row + 2) % 2],
        opacity: Number(opacity.toFixed(2)),
        strokeOpacity: Number((opacity * 0.75).toFixed(2))
      });
    }
  }
  return cells;
})();

export interface GateArtProps {
  /** Overlay placed inside the niche (the book shelf). Positioned by `.hx-shelf`. */
  children?: ReactNode;
  /** Accessible description of the artwork. */
  label?: string;
  className?: string;
}

/**
 * Ishtar-gate x mihrab artwork: glazed lapis brick, stepped crown, gold rosette
 * band, star-pattern piers and a pointed niche with a muqarnas hood.
 * Intrinsic ratio is 480:620; children are absolutely positioned over the niche.
 */
export function GateArt({
  children,
  label = 'بوابة بابلية بقوس محراب، يعلوها شريط وردات ذهبية',
  className
}: GateArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `hx-${uid}-${name}`;
  const star = (cx: number, cy: number, r: number, rot = 0) =>
    starPoints(cx, cy, r, r * OCTAGRAM_RATIO, 8, rot);

  return (
    <div className={['hx-gate-art', className].filter(Boolean).join(' ')}>
      <svg
        viewBox="0 0 480 620"
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
          <pattern id={id('stp')} width="40" height="40" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#e2b84e" strokeWidth="1.1" opacity=".55">
              <polygon points={star(20, 20, 20)} />
              <polygon points={star(20, 20, 8, 22.5)} />
            </g>
          </pattern>
          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id('glow')} cx="50%" cy="92%" r="75%">
            <stop offset="0" stopColor="#f0c75a" stopOpacity=".55" />
            <stop offset=".45" stopColor="#b8892b" stopOpacity=".18" />
            <stop offset="1" stopColor="#050d26" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('niche')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#07153a" />
            <stop offset="1" stopColor="#0a1d4a" />
          </linearGradient>
          <clipPath id={id('clip')}>
            <path d={ARCH_PATH} />
          </clipPath>
        </defs>

        {/* body */}
        <path d={BODY_PATH} fill="#17399a" />
        <path d={BODY_PATH} fill={`url(#${id('brk')})`} />
        <path d={BODY_PATH} fill={`url(#${id('gloss')})`} />
        <path d={BODY_PATH} fill="none" stroke="#e2b84e" strokeWidth="3" />

        {/* crown medallion */}
        <g transform="translate(240 102)">
          <polygon
            points={star(0, 0, 33)}
            fill="#0d2257"
            stroke="#e2b84e"
            strokeWidth="2.2"
          />
          <polygon
            points={star(0, 0, 21, 22.5)}
            fill="#1d8a86"
            stroke="#f1d27a"
            strokeWidth="1.4"
          />
          <circle r="7" fill="#f1d27a" />
          <circle r="3" fill="#0d2257" />
        </g>
        <g fill="#e2b84e">
          <polygon points={star(130, 112, 8)} />
          <polygon points={star(350, 112, 8)} />
          <polygon points={star(72, 140, 6)} />
          <polygon points={star(408, 140, 6)} />
        </g>

        {/* rosette band */}
        <rect x="20" y="146" width="440" height="44" fill="#0d2257" fillOpacity=".55" />
        <path d="M20 148H460M20 188H460" stroke="#e2b84e" strokeWidth="2.4" />
        <path d="M20 153H460M20 183H460" stroke="#e2b84e" strokeWidth=".8" opacity=".7" />
        {BAND_ROSETTES.map((x) => (
          <use
            key={x}
            href={`#${id('ros')}`}
            transform={`translate(${x} 168) scale(.78)`}
          />
        ))}

        {/* piers */}
        <rect
          x="32"
          y="204"
          width="76"
          height="352"
          fill={`url(#${id('stp')})`}
          stroke="#e2b84e"
          strokeWidth="1.6"
          strokeOpacity=".8"
        />
        <rect
          x="372"
          y="204"
          width="76"
          height="352"
          fill={`url(#${id('stp')})`}
          stroke="#e2b84e"
          strokeWidth="1.6"
          strokeOpacity=".8"
        />

        {/* niche */}
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
              strokeWidth=".9"
            />
          ))}
          <rect
            x="100"
            y="360"
            width="280"
            height="215"
            fill={`url(#${id('niche')})`}
            opacity=".55"
          />
          <rect x="100" y="200" width="280" height="380" fill={`url(#${id('glow')})`} />
        </g>
        <g transform="translate(240 352)">
          <polygon points={star(0, 0, 17)} fill="#e2b84e" />
          <circle r="7" fill="#1d8a86" stroke="#0d2257" strokeWidth="1.2" />
        </g>

        {/* arch frame */}
        <path d={ARCH_PATH} fill="none" stroke="#06143a" strokeWidth="30" />
        <path d={ARCH_PATH} fill="none" stroke="#e2b84e" strokeWidth="22" />
        <path d={ARCH_PATH} fill="none" stroke="#17399a" strokeWidth="16" />
        <path d={ARCH_PATH} fill="none" stroke="#1d8a86" strokeWidth="9" />
        <path d={ARCH_PATH} fill="none" stroke="#f1d27a" strokeWidth="2.2" />

        {/* plinth */}
        <rect x="20" y="570" width="440" height="50" fill="#0d2257" />
        <path d="M20 572H460" stroke="#e2b84e" strokeWidth="3" />
        {PLINTH_ROSETTES.map((x) => (
          <use
            key={x}
            href={`#${id('ros')}`}
            transform={`translate(${x} 598) scale(.55)`}
          />
        ))}
        <rect x="120" y="562" width="240" height="9" fill="#2a1a0c" />
        <path d="M120 562H360" stroke="#e2b84e" strokeWidth="1.4" opacity=".8" />
      </svg>
      {children}
    </div>
  );
}
