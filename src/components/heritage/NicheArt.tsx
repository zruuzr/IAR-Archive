import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

/** Stepped (ziggurat) crown over a lapis body — the Ishtar gate, scaled down for one book. */
const BODY_PATH = 'M10,412V104H34V76H62V42H258V76H286V104H310V412Z';
/** Pointed (mihrab) arch. The interior is 240 wide, so a 5:7 cover fits under the spring line. */
const ARCH_PATH = 'M40,382V240C40,176 98,134 160,104C222,134 280,176 280,240V382Z';

const PLINTH_ROSETTES = Array.from({ length: 7 }, (_, i) => 36 + 41.3 * i);

/** Muqarnas (stalactite) cells filling the hood, row by row. */
const MUQARNAS_CELLS = (() => {
  const palette = ['#143f8f', '#0f7377'];
  const cells: { key: string; d: string; fill: string; opacity: number }[] = [];
  for (let row = 0; row < 6; row += 1) {
    const y = 108 + row * 19;
    const offset = 13 * (row % 2);
    const opacity = Math.max(0.3, 0.96 - row * 0.12);
    for (let col = -1; col < 10; col += 1) {
      const x = 26 + col * 26 + offset;
      cells.push({
        key: `${row}-${col}`,
        d: `M${x},${y + 24}L${x},${y + 11}Q${x},${y + 3} ${x + 13},${y}Q${x + 26},${y + 3} ${x + 26},${y + 11}L${x + 26},${y + 24}Z`,
        fill: palette[(col + row + 2) % 2],
        opacity: Number(opacity.toFixed(2))
      });
    }
  }
  return cells;
})();

export interface NicheArtProps {
  /** The cover, placed inside the niche (standing on the shelf). */
  children?: ReactNode;
  /** Extra controls placed over the artwork (e.g. a zoom button). */
  overlay?: ReactNode;
  className?: string;
}

/**
 * Mihrab niche that frames one book on the details page. Intrinsic ratio 320:420.
 * Decorative: the book itself is the content, so the SVG is `aria-hidden`.
 */
export function NicheArt({ children, overlay, className }: NicheArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `hxn-${uid}-${name}`;
  const star = (cx: number, cy: number, r: number, rot = 0) =>
    starPoints(cx, cy, r, r * OCTAGRAM_RATIO, 8, rot);

  return (
    <div className={cn('hx-niche', className)}>
      <svg viewBox="0 0 320 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
          <pattern id={id('stp')} width="34" height="34" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="#e2b84e" strokeWidth="1" opacity=".5">
              <polygon points={star(17, 17, 17)} />
              <polygon points={star(17, 17, 7, 22.5)} />
            </g>
          </pattern>
          <linearGradient id={id('gloss')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".16" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={id('glow')} cx="50%" cy="96%" r="80%">
            <stop offset="0" stopColor="#f0c75a" stopOpacity=".6" />
            <stop offset=".5" stopColor="#b8892b" stopOpacity=".16" />
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
        <path d={BODY_PATH} fill={`url(#${id('stp')})`} />
        <path d={BODY_PATH} fill={`url(#${id('gloss')})`} />
        <path d={BODY_PATH} fill="none" stroke="#e2b84e" strokeWidth="3" />

        {/* crown */}
        <g transform="translate(160 64)">
          <polygon
            points={star(0, 0, 17)}
            fill="#0d2257"
            stroke="#e2b84e"
            strokeWidth="1.8"
          />
          <polygon
            points={star(0, 0, 10.5, 22.5)}
            fill="#1d8a86"
            stroke="#f1d27a"
            strokeWidth="1.2"
          />
          <circle r="4.4" fill="#f1d27a" />
          <circle r="1.9" fill="#0d2257" />
        </g>
        <g fill="#e2b84e">
          <polygon points={star(100, 70, 5.5)} />
          <polygon points={star(220, 70, 5.5)} />
          <polygon points={star(48, 90, 4.5)} />
          <polygon points={star(272, 90, 4.5)} />
        </g>

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
              strokeOpacity={Number((c.opacity * 0.75).toFixed(2))}
              strokeWidth=".8"
            />
          ))}
          <rect
            x="30"
            y="236"
            width="260"
            height="150"
            fill={`url(#${id('niche')})`}
            opacity=".6"
          />
          <rect x="30" y="100" width="260" height="290" fill={`url(#${id('glow')})`} />
        </g>

        {/* arch frame */}
        <path d={ARCH_PATH} fill="none" stroke="#06143a" strokeWidth="20" />
        <path d={ARCH_PATH} fill="none" stroke="#e2b84e" strokeWidth="14" />
        <path d={ARCH_PATH} fill="none" stroke="#17399a" strokeWidth="10" />
        <path d={ARCH_PATH} fill="none" stroke="#1d8a86" strokeWidth="5.5" />
        <path d={ARCH_PATH} fill="none" stroke="#f1d27a" strokeWidth="1.6" />

        {/* shelf and plinth */}
        <rect x="40" y="376" width="240" height="8" fill="#2a1a0c" />
        <path d="M40 376H280" stroke="#e2b84e" strokeWidth="1.4" opacity=".85" />
        <rect x="10" y="384" width="300" height="28" fill="#0d2257" />
        <path d="M10 386H310" stroke="#e2b84e" strokeWidth="2.4" />
        {PLINTH_ROSETTES.map((x) => (
          <use
            key={x}
            href={`#${id('ros')}`}
            transform={`translate(${x} 399) scale(.42)`}
          />
        ))}
      </svg>
      <div className="hx-niche-cover">{children}</div>
      {overlay}
    </div>
  );
}
