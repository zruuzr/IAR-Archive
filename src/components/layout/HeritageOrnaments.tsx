import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/utils';

const ISHTAR_FRIEZE_UNITS = Array.from({ length: 22 }, (_, i) => i * 64 + 18);

export type IslamicHeroFormation =
  'girih_shamsa' | 'manuscript_corners' | 'mustansiriya_lattice' | 'abbasid_mihrab';

function polarPoint(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [Number((r * Math.cos(rad)).toFixed(2)), Number((r * Math.sin(rad)).toFixed(2))];
}

function buildStarPoints(n: number, rOuter: number, rInner: number, rotDeg = 0): string {
  const pts: string[] = [];
  const step = 180 / n;
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const [x, y] = polarPoint(r, rotDeg + i * step);
    pts.push(`${x},${y}`);
  }
  return pts.join(' ');
}

function buildRosettePetalsPath(
  n: number,
  rBase: number,
  rShoulder: number,
  rTip: number,
  halfSpreadDeg: number,
  rotDeg = 0
): string {
  const segs: string[] = [];
  const step = 360 / n;
  for (let i = 0; i < n; i += 1) {
    const c = rotDeg + i * step;
    const [x0, y0] = polarPoint(rBase, c - halfSpreadDeg * 0.72);
    const [x1, y1] = polarPoint(rShoulder, c - halfSpreadDeg);
    const [xt, yt] = polarPoint(rTip, c);
    const [x2, y2] = polarPoint(rShoulder, c + halfSpreadDeg);
    const [x3, y3] = polarPoint(rBase, c + halfSpreadDeg * 0.72);
    segs.push(`M${x0},${y0} L${x1},${y1} L${xt},${yt} L${x2},${y2} L${x3},${y3}`);
  }
  return segs.join(' ');
}

function buildScallopedMedallionPath(
  lobes: number,
  rInner: number,
  rOuter: number
): string {
  const segs: string[] = [];
  const step = 360 / lobes;
  for (let i = 0; i < lobes; i += 1) {
    const a1 = i * step;
    const amid = a1 + step * 0.5;
    const a2 = a1 + step;
    const [x1, y1] = polarPoint(rInner, a1);
    const [xc, yc] = polarPoint(rOuter, amid);
    const [x2, y2] = polarPoint(rInner, a2);
    segs.push(
      i === 0 ? `M${x1},${y1} Q${xc},${yc} ${x2},${y2}` : `Q${xc},${yc} ${x2},${y2}`
    );
  }
  return `${segs.join(' ')} Z`;
}

function buildRadialTicksPath(count: number, r1: number, r2: number, rotDeg = 0): string {
  const segs: string[] = [];
  const step = 360 / count;
  for (let i = 0; i < count; i += 1) {
    const a = rotDeg + i * step;
    const [x1, y1] = polarPoint(r1, a);
    const [x2, y2] = polarPoint(r2, a);
    segs.push(`M${x1},${y1} L${x2},${y2}`);
  }
  return segs.join(' ');
}

function buildLotusArchesPath(n: number, rBase: number, rCtrl: number): string {
  const segs: string[] = [];
  const step = 360 / n;
  for (let i = 0; i < n; i += 1) {
    const a1 = i * step;
    const amid = a1 + step * 0.5;
    const a2 = a1 + step;
    const [x1, y1] = polarPoint(rBase, a1);
    const [xc, yc] = polarPoint(rCtrl, amid);
    const [x2, y2] = polarPoint(rBase, a2);
    segs.push(`M${x1},${y1} Q${xc},${yc} ${x2},${y2}`);
  }
  return segs.join(' ');
}

const SHAMSA16_SCALLOP = buildScallopedMedallionPath(32, 107, 114);
const SHAMSA16_PETALS = buildRosettePetalsPath(16, 42, 78, 96, 8.2);
const SHAMSA16_INNER_PETALS = buildRosettePetalsPath(16, 20, 34, 45, 7.5, 11.25);
const SHAMSA16_STAR_A = buildStarPoints(16, 88, 52, 0);
const SHAMSA16_STAR_B = buildStarPoints(16, 88, 52, 11.25);
const SHAMSA16_KHATAM_A = buildStarPoints(8, 36, 19, 0);
const SHAMSA16_KHATAM_B = buildStarPoints(8, 36, 19, 22.5);
const SHAMSA16_PEARLS = Array.from({ length: 16 }, (_, i) => polarPoint(101, i * 22.5));

const SAMARRA12_TICKS = buildRadialTicksPath(72, 101, 107);
const SAMARRA12_SPOKES = buildRadialTicksPath(12, 22, 96);
const SAMARRA12_ARCHES_A = buildLotusArchesPath(12, 68, 102);
const SAMARRA12_ARCHES_B = buildLotusArchesPath(12, 54, 88);
const SAMARRA12_PETALS = buildRosettePetalsPath(12, 32, 64, 82, 10.5, 15);
const SAMARRA12_STAR_A = buildStarPoints(12, 92, 48, 0);
const SAMARRA12_STAR_B = buildStarPoints(12, 92, 48, 15);
const SAMARRA12_HEX_STAR = buildStarPoints(6, 34, 18, 0);

const GIRIH_TILE_STAR_A = buildStarPoints(8, 28, 15, 0);
const GIRIH_TILE_STAR_B = buildStarPoints(8, 28, 15, 22.5);
const GIRIH_TILE_PETALS = buildRosettePetalsPath(8, 13, 25, 35, 11.5);
const GIRIH_CORNER_STAR = buildStarPoints(8, 22, 11, 0);

const LATTICE12_STAR = buildStarPoints(12, 34, 18, 0);
const LATTICE12_PETALS = buildRosettePetalsPath(12, 16, 30, 42, 10.5);
const LATTICE12_RAYS = buildRadialTicksPath(12, 42, 78);

const HALO24_RAYS = buildRadialTicksPath(24, 58, 158);
const HALO24_STAR = buildStarPoints(24, 146, 98, 0);

/**
 * 1) Sumerian 8-Pointed Dingir / Shamash Star (Concept 01).
 */
export function SumerianStarIcon({
  className = 'size-3.5 shrink-0',
  fill = 'var(--brass)',
  centerFill
}: {
  className?: string;
  fill?: string;
  centerFill?: string;
}) {
  const gradId = useId();
  const useMetallicGold = fill === 'var(--brass)';
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {useMetallicGold && (
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--brass-bright)" />
            <stop offset="50%" stopColor="var(--brass)" />
            <stop offset="100%" stopColor="var(--brass-bright)" />
          </linearGradient>
        </defs>
      )}
      <polygon
        points="16,1 19,11 29,6 22,14 31,16 22,18 29,26 19,21 16,31 13,21 3,26 10,18 1,16 10,14 3,6 13,11"
        fill={useMetallicGold ? `url(#${gradId})` : fill}
      />
      {centerFill && <circle cx="16" cy="16" r="3" fill={centerFill} />}
    </svg>
  );
}

/**
 * 2) Delicate Sumerian Cuneiform Wedge Frieze Strip (Concept 01 — Top Colophon).
 */
export function SumerianCuneiformStrip({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="sumerian-cuneiform-strip"
      className={cn('cuneiform-strip', className)}
    >
      <svg width="156" height="12" viewBox="0 0 156 12" fill="currentColor">
        <polygon points="4,2 10,6 4,10 6,6" />
        <rect x="9" y="5.3" width="14" height="1.4" />
        <polygon points="30,2 33,10 27,10" />
        <polygon points="42,2 48,6 42,10 44,6" />
        <rect x="47" y="5.3" width="16" height="1.4" />
        <circle cx="71" cy="6" r="1.8" />
        <polygon points="82,2 88,6 82,10 84,6" />
        <rect x="87" y="5.3" width="14" height="1.4" />
        <polygon points="109,2 112,10 106,10" />
        <polygon points="122,2 128,6 122,10 124,6" />
        <rect x="127" y="5.3" width="16" height="1.4" />
      </svg>
    </span>
  );
}

/**
 * 3) Engraved Sumerian Cuneiform Architectural Shelf Plinth (Concept 01A).
 */
export function SumerianShelfPlinth({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-testid="sumerian-shelf-plinth"
      className={cn('shelf-cuneiform-plinth', className)}
    >
      <svg
        width="780"
        height="14"
        viewBox="0 0 780 14"
        fill="var(--brass)"
        style={{ opacity: 'var(--cuneiform-opacity)' }}
        className="max-w-full"
      >
        <g>
          <polygon points="20,3 28,7 20,11 23,7" />
          <rect x="27" y="6.3" width="22" height="1.4" />
          <polygon points="62,2 66,12 58,12" />
          <polygon points="82,3 90,7 82,11 85,7" />
          <rect x="89" y="6.3" width="22" height="1.4" />
          <circle cx="126" cy="7" r="2.2" />
          <polygon points="142,3 150,7 142,11 145,7" />
          <rect x="149" y="6.3" width="24" height="1.4" />
          <polygon points="188,2 192,12 184,12" />
          <polygon points="208,3 216,7 208,11 211,7" />
          <rect x="215" y="6.3" width="20" height="1.4" />

          {/* Center 8-Pointed Shamash Star on Plinth */}
          <g transform="translate(390, 7)">
            <line
              x1="-125"
              y1="0"
              x2="-22"
              y2="0"
              stroke="var(--brass)"
              strokeWidth="1"
            />
            <polygon
              points="0,-6.5 2,-2 6.5,-4 3.5,0 6.5,4 2,2 0,6.5 -2,2 -6.5,4 -3.5,0 -6.5,-4 -2,-2"
              fill="var(--brass-bright)"
            />
            <line x1="22" y1="0" x2="125" y2="0" stroke="var(--brass)" strokeWidth="1" />
          </g>

          <polygon points="546,3 554,7 546,11 549,7" />
          <rect x="553" y="6.3" width="20" height="1.4" />
          <polygon points="588,2 592,12 584,12" />
          <polygon points="608,3 616,7 608,11 611,7" />
          <rect x="615" y="6.3" width="24" height="1.4" />
          <circle cx="654" cy="7" r="2.2" />
          <polygon points="670,3 678,7 670,11 673,7" />
          <rect x="677" y="6.3" width="22" height="1.4" />
          <polygon points="714,2 718,12 710,12" />
          <polygon points="734,3 742,7 734,11 737,7" />
          <rect x="741" y="6.3" width="20" height="1.4" />
        </g>
      </svg>
    </div>
  );
}

/**
 * 4) Babylonian Ishtar Gate Lapis & 12-Petal Glazed Rosette Frieze Band (Concept 02).
 * Rendered with freshly fired Royal Glazed Lapis, Turquoise Faience, 24k Gold gradients,
 * and a ceramic specular glaze sheen.
 */
export function BabylonianIshtarFrieze({
  className,
  testId
}: {
  className?: string;
  testId?: string;
}) {
  const uid = useId();
  const lapisId = `${uid}-lapis`;
  const goldId = `${uid}-gold`;
  const turqId = `${uid}-turq`;
  const sheenId = `${uid}-sheen`;

  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={cn('ishtar-frieze-band', className)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1400 28"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={lapisId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e5e8a" />
            <stop offset="48%" stopColor="#0a4566" />
            <stop offset="100%" stopColor="#062b42" />
          </linearGradient>
          <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5e6c4" />
            <stop offset="45%" stopColor="#bfa065" />
            <stop offset="100%" stopColor="#dec592" />
          </linearGradient>
          <linearGradient id={turqId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id={sheenId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1400" height="28" fill={`url(#${lapisId})`} />
        <rect x="0" y="0" width="1400" height="2.3" fill={`url(#${goldId})`} />
        <rect x="0" y="2.3" width="1400" height="1.8" fill={`url(#${turqId})`} />
        {ISHTAR_FRIEZE_UNITS.map((x) => (
          <g key={x} transform={`translate(${x}, 14)`}>
            <circle
              cx="0"
              cy="0"
              r="8.2"
              fill="#ffffff"
              stroke={`url(#${goldId})`}
              strokeWidth="1.5"
            />
            <circle
              cx="0"
              cy="0"
              r="5.4"
              fill="none"
              stroke="#0a4566"
              strokeWidth="1"
              strokeDasharray="2.2 1.5"
            />
            <circle cx="0" cy="0" r="3" fill={`url(#${goldId})`} />
            <path
              d="M22,9 L22,2 L26,2 L26,-3 L30,-3 L30,-7 L36,-7 L36,-3 L40,-3 L40,2 L44,2 L44,9 Z"
              fill={`url(#${goldId})`}
              opacity="0.96"
            />
            <path
              d="M26,9 L26,3 L30,3 L30,-2 L36,-2 L36,3 L40,3 L40,9 Z"
              fill={`url(#${turqId})`}
            />
          </g>
        ))}
        {/* Glossy Ceramic Glaze Highlight */}
        <rect x="0" y="2.3" width="1400" height="11" fill={`url(#${sheenId})`} />
        <rect x="0" y="23.9" width="1400" height="1.8" fill={`url(#${turqId})`} />
        <rect x="0" y="25.7" width="1400" height="2.3" fill={`url(#${goldId})`} />
      </svg>
    </div>
  );
}

/**
 * 5) 12-Petal Babylonian Ishtar Glazed Rosette Medallion (Concept 02).
 */
export function BabylonianIshtarRosetteIcon({
  className = 'size-5 shrink-0'
}: {
  className?: string;
}) {
  const uid = useId();
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id={`${uid}-lapis`} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#0e5e8a" />
          <stop offset="100%" stopColor="#062b42" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5e6c4" />
          <stop offset="50%" stopColor="#bfa065" />
          <stop offset="100%" stopColor="#dec592" />
        </linearGradient>
      </defs>
      <circle
        cx="18"
        cy="18"
        r="16"
        fill={`url(#${uid}-lapis)`}
        stroke={`url(#${uid}-gold)`}
        strokeWidth="2"
      />
      <circle
        cx="18"
        cy="18"
        r="11"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle cx="18" cy="18" r="5.2" fill={`url(#${uid}-gold)`} />
    </svg>
  );
}

/**
 * 5B) Baghdadi 8-Pointed Khatam Star-Rosette for Illuminated Motto Cartouche.
 */
export function KhatamMedallionIcon({
  className = 'size-4 shrink-0'
}: {
  className?: string;
}) {
  const uid = useId();
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`${uid}-khatam`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--brass-bright)" />
          <stop offset="50%" stopColor="var(--brass)" />
          <stop offset="100%" stopColor="var(--brass-bright)" />
        </linearGradient>
      </defs>
      <g transform="translate(14,14)">
        <polygon points={buildStarPoints(8, 13, 7.2, 0)} fill={`url(#${uid}-khatam)`} />
        <polygon
          points={buildStarPoints(8, 9.6, 5.2, 22.5)}
          fill="var(--surface)"
          stroke="var(--teal)"
          strokeWidth="0.9"
        />
        <rect
          x="-3.2"
          y="-3.2"
          width="6.4"
          height="6.4"
          transform="rotate(45)"
          fill="var(--terracotta)"
        />
        <circle cx="0" cy="0" r="1.5" fill="var(--brass-bright)" />
      </g>
    </svg>
  );
}

/**
 * 5C) Illuminated Manuscript Filigree Wing flanking the Hero Motto Cartouche.
 */
export function CartoucheFiligreeWing({
  side,
  className
}: {
  side: 'start' | 'end';
  className?: string;
}) {
  return (
    <svg
      width="84"
      height="22"
      viewBox="0 0 84 22"
      fill="none"
      aria-hidden="true"
      className={cn(
        'shrink-0 select-none pointer-events-none',
        side === 'end' && 'scale-x-[-1]',
        className
      )}
    >
      <line
        x1="2"
        y1="11"
        x2="54"
        y2="11"
        stroke="var(--brass)"
        strokeWidth="1"
        strokeOpacity="0.45"
      />
      <line
        x1="18"
        y1="8.2"
        x2="54"
        y2="8.2"
        stroke="var(--brass)"
        strokeWidth="0.6"
        strokeOpacity="0.28"
      />
      <line
        x1="18"
        y1="13.8"
        x2="54"
        y2="13.8"
        stroke="var(--brass)"
        strokeWidth="0.6"
        strokeOpacity="0.28"
      />
      <circle cx="14" cy="11" r="1.6" fill="var(--brass)" fillOpacity="0.55" />
      <polygon points="34,11 39,7.5 44,11 39,14.5" stroke="var(--teal)" strokeWidth="1" />
      <circle cx="39" cy="11" r="1.3" fill="var(--brass)" />
      {/* Arabesque Palmette Finial meeting the Cartouche edge */}
      <path
        d="M54,11 C59,5 66,4.5 72,8.5 L80,11 L72,13.5 C66,17.5 59,17 54,11 Z"
        fill="var(--surface)"
        stroke="var(--brass)"
        strokeWidth="1.15"
      />
      <polygon
        points="65,11 69,8.2 73,11 69,13.8"
        fill="var(--terracotta)"
        opacity="0.88"
      />
    </svg>
  );
}

/**
 * 6) Subtle Babylonian Stepped Arch & Islamic Star Rosette Corner Watermark (Concept 02).
 */
export function BabylonianSteppedArchWatermark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 145"
      fill="none"
      aria-hidden="true"
      className={cn('spotlight-arch-watermark', className)}
    >
      <path
        d="M12,142 L12,46 L24,46 L24,30 L40,30 L40,16 L70,16 L70,30 L86,30 L86,46 L98,46 L98,142 Z"
        stroke="var(--ink)"
        strokeWidth="2.6"
      />
      <path
        d="M26,142 L26,62 C26,40 55,30 55,30 C55,30 84,40 84,62 L84,142 Z"
        stroke="var(--brass)"
        strokeWidth="2.2"
      />
      <g transform="translate(55, 72)">
        <polygon
          points={buildStarPoints(8, 17, 9, 0)}
          stroke="var(--terracotta)"
          strokeWidth="1.8"
        />
        <circle cx="0" cy="0" r="5" stroke="var(--teal)" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/**
 * 7) Authentic Baghdadi & Abbasid Geometric Shamsa / Samarra Astrolabe Watermark.
 */
export function AbbasidShamsaWatermark({
  variant = 'full',
  className
}: {
  variant?: 'full' | 'compact' | 'samarra' | 'sidebar';
  className?: string;
}) {
  if (variant === 'sidebar') {
    return (
      <svg
        viewBox="0 0 140 140"
        fill="none"
        aria-hidden="true"
        className={cn('shamsa-sidebar-watermark', className)}
      >
        <g transform="translate(70,70)">
          <path
            d={buildScallopedMedallionPath(24, 58, 63)}
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <circle
            cx="0"
            cy="0"
            r="54"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeDasharray="2.5 2.5"
          />
          <path
            d={buildRosettePetalsPath(12, 20, 40, 51, 10.5)}
            stroke="var(--teal)"
            strokeWidth="1"
            opacity="0.85"
          />
          <polygon
            points={buildStarPoints(12, 46, 25, 0)}
            stroke="currentColor"
            strokeWidth="1.15"
          />
          <polygon
            points={buildStarPoints(12, 46, 25, 15)}
            stroke="currentColor"
            strokeWidth="0.85"
            opacity="0.7"
          />
          <circle cx="0" cy="0" r="14" stroke="currentColor" strokeWidth="1.1" />
          <circle cx="0" cy="0" r="5" stroke="var(--teal)" strokeWidth="1.1" />
        </g>
      </svg>
    );
  }

  if (variant === 'samarra' || variant === 'compact') {
    return (
      <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" className={className}>
        <g transform="translate(120,120)">
          <circle cx="0" cy="0" r="110" stroke="currentColor" strokeWidth="1" />
          <circle cx="0" cy="0" r="100" stroke="currentColor" strokeWidth="0.85" />
          <path
            d={SAMARRA12_TICKS}
            stroke="currentColor"
            strokeWidth="0.85"
            opacity="0.7"
          />
          <path d={SAMARRA12_ARCHES_A} stroke="currentColor" strokeWidth="1.1" />
          <path
            d={SAMARRA12_ARCHES_B}
            stroke="var(--teal)"
            strokeWidth="0.95"
            opacity="0.75"
          />
          <path
            d={SAMARRA12_SPOKES}
            stroke="currentColor"
            strokeWidth="0.65"
            opacity="0.45"
          />
          <path d={SAMARRA12_PETALS} stroke="var(--teal)" strokeWidth="1" opacity="0.8" />
          <polygon points={SAMARRA12_STAR_A} stroke="currentColor" strokeWidth="1.2" />
          <polygon
            points={SAMARRA12_STAR_B}
            stroke="currentColor"
            strokeWidth="0.95"
            opacity="0.8"
          />
          <circle
            cx="0"
            cy="0"
            r="38"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
          <polygon points={SAMARRA12_HEX_STAR} stroke="var(--teal)" strokeWidth="1.1" />
          <circle cx="0" cy="0" r="11" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="0" cy="0" r="4" fill="currentColor" />
        </g>
      </svg>
    );
  }

  // 16-Fold Mustansiriya Illuminated Shamsa Medallion ('full')
  return (
    <svg viewBox="0 0 240 240" fill="none" aria-hidden="true" className={className}>
      <g transform="translate(120,120)">
        <path d={SHAMSA16_SCALLOP} stroke="currentColor" strokeWidth="1.15" />
        <circle cx="0" cy="0" r="104" stroke="currentColor" strokeWidth="0.9" />
        <circle
          cx="0"
          cy="0"
          r="98"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="2.5 2.5"
        />
        {SHAMSA16_PEARLS.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="1.6" fill="currentColor" opacity="0.8" />
        ))}
        <path
          d={SHAMSA16_PETALS}
          stroke="var(--teal)"
          strokeWidth="1.05"
          opacity="0.82"
        />
        <polygon points={SHAMSA16_STAR_A} stroke="currentColor" strokeWidth="1.2" />
        <polygon
          points={SHAMSA16_STAR_B}
          stroke="currentColor"
          strokeWidth="0.95"
          opacity="0.8"
        />
        <circle cx="0" cy="0" r="48" stroke="currentColor" strokeWidth="0.95" />
        <path
          d={SHAMSA16_INNER_PETALS}
          stroke="currentColor"
          strokeWidth="0.85"
          opacity="0.75"
        />
        <polygon
          points={SHAMSA16_KHATAM_A}
          stroke="var(--teal)"
          strokeWidth="1.1"
          opacity="0.88"
        />
        <polygon points={SHAMSA16_KHATAM_B} stroke="currentColor" strokeWidth="1" />
        <circle cx="0" cy="0" r="13" stroke="currentColor" strokeWidth="1.15" />
        <circle cx="0" cy="0" r="4.5" fill="currentColor" />
      </g>
    </svg>
  );
}

/**
 * 7B) Multi-Model Hero Islamic Geometric Illumination Backdrop.
 * Supports 4 authentic Iraqi & Islamic geometric formations:
 *  - 'mustansiriya_lattice' (Default): Full-Field Isometric 12-Pointed Star & Hexagonal Kundah Brickwork Tessellation
 *  - 'girih_shamsa': Seamless 8-Star Girih field + 16-Fold Mustansiriya Shamsa & 12-Fold Samarra Astrolabe
 *  - 'manuscript_corners': Royal Illuminated Manuscript Double Border + 4 Symmetric Quarter-Shamsas + 24-Ray Halo
 *  - 'abbasid_mihrab': Grand Abbasid Multi-Lobed Pointed Iwan Archivolts + Interlaced Islimi Arabesque Spandrels
 */
export function HeroIslamicPatternBackdrop({
  formation = 'mustansiriya_lattice'
}: {
  formation?: IslamicHeroFormation;
}) {
  const uid = useId();
  const [overrideFormation, setOverrideFormation] = useState<IslamicHeroFormation | null>(
    null
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const syncAttr = () => {
      const val = root.getAttribute(
        'data-islamic-formation'
      ) as IslamicHeroFormation | null;
      if (
        val === 'girih_shamsa' ||
        val === 'manuscript_corners' ||
        val === 'mustansiriya_lattice' ||
        val === 'abbasid_mihrab'
      ) {
        setOverrideFormation(val);
      } else {
        setOverrideFormation(null);
      }
    };
    syncAttr();
    const observer = new MutationObserver(syncAttr);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-islamic-formation']
    });
    return () => observer.disconnect();
  }, []);

  const active = overrideFormation ?? formation;

  return (
    <div
      aria-hidden="true"
      data-testid="hero-islamic-backdrop"
      data-formation={active}
      className="hero-islamic-backdrop"
    >
      {active === 'girih_shamsa' && (
        <>
          <svg className="hero-islamic-field-svg" width="100%" height="100%">
            <defs>
              <pattern
                id={`${uid}-girih8`}
                width="112"
                height="112"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M56,0 L112,56 L56,112 L0,56 Z M0,28 L28,0 M84,0 L112,28 M112,84 L84,112 M28,112 L0,84"
                  fill="none"
                  stroke="var(--brass)"
                  strokeWidth="0.7"
                  opacity="0.55"
                />
                <g transform="translate(56,56)">
                  <path
                    d={GIRIH_TILE_PETALS}
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="0.7"
                    opacity="0.6"
                  />
                  <polygon
                    points={GIRIH_TILE_STAR_A}
                    fill="none"
                    stroke="var(--brass)"
                    strokeWidth="0.85"
                  />
                  <polygon
                    points={GIRIH_TILE_STAR_B}
                    fill="none"
                    stroke="var(--brass)"
                    strokeWidth="0.65"
                    opacity="0.65"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="4.8"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="0.7"
                  />
                </g>
                {(
                  [
                    [0, 0],
                    [112, 0],
                    [0, 112],
                    [112, 112]
                  ] as const
                ).map(([cx, cy], idx) => (
                  <g key={idx} transform={`translate(${cx},${cy})`}>
                    <polygon
                      points={GIRIH_CORNER_STAR}
                      fill="none"
                      stroke="var(--brass)"
                      strokeWidth="0.7"
                      opacity="0.6"
                    />
                  </g>
                ))}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${uid}-girih8)`} />
          </svg>

          <AbbasidShamsaWatermark
            variant="full"
            className="shamsa-hero-watermark shamsa-hero-watermark--end"
          />
          <AbbasidShamsaWatermark
            variant="samarra"
            className="shamsa-hero-watermark shamsa-hero-watermark--start"
          />
        </>
      )}

      {active === 'manuscript_corners' && (
        <>
          <div className="hero-manuscript-frame" />
          {/* Four Symmetric Quarter-Shamsa Corner Illuminations */}
          <AbbasidShamsaWatermark
            variant="full"
            className="shamsa-corner-quarter shamsa-corner-quarter--tr"
          />
          <AbbasidShamsaWatermark
            variant="full"
            className="shamsa-corner-quarter shamsa-corner-quarter--tl"
          />
          <AbbasidShamsaWatermark
            variant="samarra"
            className="shamsa-corner-quarter shamsa-corner-quarter--br"
          />
          <AbbasidShamsaWatermark
            variant="samarra"
            className="shamsa-corner-quarter shamsa-corner-quarter--bl"
          />
          {/* Central Celestial 24-Ray Shamsa Halo behind the Shelf */}
          <svg viewBox="0 0 360 360" fill="none" className="hero-center-shamsa-halo">
            <g transform="translate(180,180)">
              <circle
                cx="0"
                cy="0"
                r="164"
                stroke="var(--brass)"
                strokeWidth="0.9"
                strokeDasharray="3 3"
              />
              <path
                d={HALO24_RAYS}
                stroke="var(--brass)"
                strokeWidth="0.7"
                opacity="0.65"
              />
              <polygon
                points={HALO24_STAR}
                stroke="var(--teal)"
                strokeWidth="0.9"
                opacity="0.75"
              />
              <circle cx="0" cy="0" r="92" stroke="var(--brass)" strokeWidth="0.9" />
            </g>
          </svg>
        </>
      )}

      {active === 'mustansiriya_lattice' && (
        <>
          <svg
            className="hero-islamic-field-svg hero-islamic-field-svg--prominent"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern
                id={`${uid}-mustansiriya12`}
                width="156"
                height="135.1"
                patternUnits="userSpaceOnUse"
              >
                {(
                  [
                    [0, 0],
                    [156, 0],
                    [78, 67.55],
                    [0, 135.1],
                    [156, 135.1]
                  ] as const
                ).map(([cx, cy], idx) => (
                  <g key={idx} transform={`translate(${cx},${cy})`}>
                    <path
                      d={LATTICE12_RAYS}
                      stroke="var(--brass)"
                      strokeWidth="0.65"
                      opacity="0.45"
                    />
                    <path
                      d={LATTICE12_PETALS}
                      fill="none"
                      stroke="var(--teal)"
                      strokeWidth="0.85"
                      opacity="0.75"
                    />
                    <polygon
                      points={LATTICE12_STAR}
                      fill="none"
                      stroke="var(--brass)"
                      strokeWidth="1"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="10"
                      fill="none"
                      stroke="var(--brass)"
                      strokeWidth="0.85"
                    />
                    <circle cx="0" cy="0" r="3.2" fill="var(--teal)" opacity="0.75" />
                  </g>
                ))}
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${uid}-mustansiriya12)`} />
          </svg>
        </>
      )}

      {active === 'abbasid_mihrab' && (
        <>
          <svg
            viewBox="0 0 1440 760"
            preserveAspectRatio="xMidYMin slice"
            fill="none"
            className="hero-mihrab-svg"
          >
            {/* Grand Abbasid Pointed Iwan Archivolts */}
            <path
              d="M170,760 L170,290 C170,120 470,34 720,14 C970,34 1270,120 1270,290 L1270,760"
              stroke="var(--brass)"
              strokeWidth="1.4"
            />
            <path
              d="M196,760 L196,298 C196,138 482,54 720,34 C958,54 1244,138 1244,298 L1244,760"
              stroke="var(--teal)"
              strokeWidth="1"
              strokeDasharray="5 4"
            />
            <path
              d="M226,760 L226,312 C226,162 496,80 720,58 C944,80 1214,162 1214,312 L1214,760"
              stroke="var(--brass)"
              strokeWidth="1.1"
              opacity="0.75"
            />
            {/* Spandrel Islimi Arabesque Scrolls & Shamsa Medallions */}
            <g transform="translate(115, 118)">
              <path
                d={SHAMSA16_PETALS}
                stroke="var(--teal)"
                strokeWidth="1"
                opacity="0.8"
                transform="scale(0.78)"
              />
              <polygon
                points={SHAMSA16_STAR_A}
                stroke="var(--brass)"
                strokeWidth="1.15"
                transform="scale(0.78)"
              />
              <circle cx="0" cy="0" r="82" stroke="var(--brass)" strokeWidth="1" />
              <circle cx="0" cy="0" r="30" stroke="var(--teal)" strokeWidth="1" />
            </g>
            <g transform="translate(1325, 118)">
              <path
                d={SHAMSA16_PETALS}
                stroke="var(--teal)"
                strokeWidth="1"
                opacity="0.8"
                transform="scale(0.78)"
              />
              <polygon
                points={SHAMSA16_STAR_A}
                stroke="var(--brass)"
                strokeWidth="1.15"
                transform="scale(0.78)"
              />
              <circle cx="0" cy="0" r="82" stroke="var(--brass)" strokeWidth="1" />
              <circle cx="0" cy="0" r="30" stroke="var(--teal)" strokeWidth="1" />
            </g>
            {/* Spandrel Islimi Tendrils */}
            <path
              d="M30,240 C90,210 150,245 210,190 C265,140 310,95 410,64"
              stroke="var(--brass)"
              strokeWidth="1"
              opacity="0.65"
            />
            <path
              d="M1410,240 C1350,210 1290,245 1230,190 C1175,140 1130,95 1030,64"
              stroke="var(--brass)"
              strokeWidth="1"
              opacity="0.65"
            />
          </svg>
        </>
      )}
    </div>
  );
}

/**
 * 8) Authentic Baghdadi Square Kufic (Banna'i) Archival Seal (Concept 04A).
 */
export function BaghdadiSquareKuficSeal({
  size = 68,
  surfaceFill = 'var(--surface)',
  className
}: {
  size?: number;
  surfaceFill?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect
        x="5"
        y="5"
        width="110"
        height="110"
        rx="4"
        fill={surfaceFill}
        stroke="var(--terracotta)"
        strokeWidth="3"
      />
      <rect
        x="12"
        y="12"
        width="96"
        height="96"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="1.2"
      />
      <g fill="var(--ink)">
        <rect x="20" y="20" width="80" height="8" />
        <rect x="92" y="20" width="8" height="48" />
        <rect x="36" y="36" width="48" height="8" />
        <rect x="36" y="36" width="8" height="48" />
        <rect x="20" y="20" width="8" height="80" />
        <rect x="20" y="92" width="80" height="8" />
        <rect x="52" y="52" width="16" height="16" fill="var(--terracotta)" />
        <rect x="52" y="76" width="48" height="8" />
        <rect x="76" y="52" width="8" height="32" />
      </g>
    </svg>
  );
}

/**
 * 9) Circular Abbasid Manuscript Verification Stamp (Concept 04A).
 */
export function AbbasidVerificationStamp({
  lang = 'ar',
  size = 76,
  className
}: {
  lang?: 'ar' | 'en';
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="var(--surface)"
        stroke="var(--teal)"
        strokeWidth="2.4"
      />
      <circle
        cx="60"
        cy="60"
        r="46"
        fill="none"
        stroke="var(--brass)"
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />
      {lang === 'ar' ? (
        <>
          <text
            x="60"
            y="50"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="13"
            fontWeight="700"
            fill="var(--teal)"
          >
            نسخة مرجعية
          </text>
          <text
            x="60"
            y="69"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="14"
            fontWeight="700"
            fill="var(--terracotta)"
          >
            مُوثَّقة
          </text>
        </>
      ) : (
        <>
          <text
            x="60"
            y="50"
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="9"
            fontWeight="700"
            fill="var(--teal)"
          >
            VERIFIED
          </text>
          <text
            x="60"
            y="66"
            textAnchor="middle"
            fontFamily="var(--font-serif)"
            fontSize="11.5"
            fontWeight="700"
            fill="var(--terracotta)"
          >
            MONOGRAPH
          </text>
        </>
      )}
      <text
        x="60"
        y="85"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="8.5"
        fontWeight="600"
        fill="var(--ink)"
      >
        IAR ARCHIVE
      </text>
    </svg>
  );
}

/**
 * 10) Architectural Hairline Section Divider (Concept 04B — Sumerian / Abbasid / Babylonian).
 */
export function HeritageDivider({
  variant = 'sumerian',
  className,
  testId
}: {
  variant?: 'sumerian' | 'abbasid' | 'babylonian';
  className?: string;
  testId?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={cn('heritage-divider', className)}
    >
      {variant === 'sumerian' && (
        <svg width="100%" height="26" viewBox="0 0 680 26" fill="none">
          <line
            x1="20"
            y1="13"
            x2="298"
            y2="13"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.55"
          />
          <polygon points="312,13 320,9 320,17" fill="var(--terracotta)" opacity="0.85" />
          <polygon
            points="340,2 343,10 351,6 346,12 354,13 346,14 351,20 343,16 340,24 337,16 329,20 334,14 326,13 334,12 329,6 337,10"
            fill="currentColor"
          />
          <polygon points="368,13 360,9 360,17" fill="var(--terracotta)" opacity="0.85" />
          <line
            x1="382"
            y1="13"
            x2="660"
            y2="13"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.55"
          />
        </svg>
      )}

      {variant === 'babylonian' && (
        <svg width="100%" height="22" viewBox="0 0 680 22" fill="none">
          <path
            d="M20,17 L270,17 L270,11 L280,11 L280,5 L292,5 L292,11 L302,11 L302,17 L324,17 L324,11 L334,11 L334,3 L346,3 L346,11 L356,11 L356,17 L378,17 L378,11 L388,11 L388,5 L400,5 L400,11 L410,11 L410,17 L660,17"
            stroke="currentColor"
            strokeWidth="1.3"
            opacity="0.75"
          />
        </svg>
      )}

      {variant === 'abbasid' && (
        <svg width="100%" height="26" viewBox="0 0 680 26" fill="none">
          <line
            x1="20"
            y1="13"
            x2="296"
            y2="13"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.55"
          />
          <rect
            x="308"
            y="9.5"
            width="7"
            height="7"
            transform="rotate(45 311.5 13)"
            fill="currentColor"
          />
          <rect
            x="332"
            y="5"
            width="16"
            height="16"
            stroke="var(--teal)"
            strokeWidth="1.4"
          />
          <rect
            x="332"
            y="5"
            width="16"
            height="16"
            transform="rotate(45 340 13)"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <circle cx="340" cy="13" r="2.8" fill="var(--terracotta)" />
          <rect
            x="365"
            y="9.5"
            width="7"
            height="7"
            transform="rotate(45 368.5 13)"
            fill="currentColor"
          />
          <line
            x1="384"
            y1="13"
            x2="660"
            y2="13"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.55"
          />
        </svg>
      )}
    </div>
  );
}
