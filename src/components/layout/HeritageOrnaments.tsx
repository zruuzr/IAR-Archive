import { useId } from 'react';
import { cn } from '@/lib/utils';

const ISHTAR_FRIEZE_UNITS = Array.from({ length: 22 }, (_, i) => i * 64 + 18);

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
            <stop offset="0%" stopColor="#1b5699" />
            <stop offset="48%" stopColor="#123f75" />
            <stop offset="100%" stopColor="#0b284d" />
          </linearGradient>
          <linearGradient id={goldId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe58f" />
            <stop offset="45%" stopColor="#ebb338" />
            <stop offset="100%" stopColor="#fbd772" />
          </linearGradient>
          <linearGradient id={turqId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#26b5ad" />
            <stop offset="100%" stopColor="#117874" />
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
              fill="#FFFDF8"
              stroke={`url(#${goldId})`}
              strokeWidth="1.5"
            />
            <circle
              cx="0"
              cy="0"
              r="5.4"
              fill="none"
              stroke="#14437A"
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
          <stop offset="0%" stopColor="#2161ab" />
          <stop offset="100%" stopColor="#0d2f59" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe694" />
          <stop offset="50%" stopColor="#e5ad32" />
          <stop offset="100%" stopColor="#f9d670" />
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
        stroke="#fffdf9"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle cx="18" cy="18" r="5.2" fill={`url(#${uid}-gold)`} />
    </svg>
  );
}

/**
 * 6) Subtle Babylonian Stepped Arch Corner Watermark (Concept 02).
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
        strokeWidth="3"
      />
      <path
        d="M28,142 L28,58 C28,38 82,38 82,58 L82,142 Z"
        stroke="var(--brass)"
        strokeWidth="2.5"
      />
      <circle cx="55" cy="68" r="13" stroke="var(--terracotta)" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * 7) Abbasid Bayt al-Hikma 12-Fold Geometric Shamsa Watermark (Concept 03A).
 */
export function AbbasidShamsaWatermark({
  variant = 'full',
  className
}: {
  variant?: 'full' | 'compact' | 'sidebar';
  className?: string;
}) {
  if (variant === 'sidebar') {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
        className={cn('shamsa-sidebar-watermark', className)}
      >
        <g transform="translate(60,60)" strokeWidth="1.3">
          <rect x="-36" y="-36" width="72" height="72" />
          <rect x="-36" y="-36" width="72" height="72" transform="rotate(30)" />
          <rect x="-36" y="-36" width="72" height="72" transform="rotate(60)" />
          <circle cx="0" cy="0" r="50" />
          <circle cx="0" cy="0" r="18" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      className={className}
    >
      <g transform="translate(120,120)" strokeWidth="1.2">
        <circle cx="0" cy="0" r="108" strokeDasharray="3 3" />
        <circle cx="0" cy="0" r="96" />
        <rect x="-68" y="-68" width="136" height="136" />
        <rect x="-68" y="-68" width="136" height="136" transform="rotate(30)" />
        <rect x="-68" y="-68" width="136" height="136" transform="rotate(60)" />
        {variant === 'full' && (
          <>
            <polygon points="0,-96 25,-25 96,0 25,25 0,96 -25,25 -96,0 -25,-25" />
            <polygon
              points="0,-96 25,-25 96,0 25,25 0,96 -25,25 -96,0 -25,-25"
              transform="rotate(45)"
            />
          </>
        )}
        <circle cx="0" cy="0" r="36" />
        {variant === 'full' && <circle cx="0" cy="0" r="14" />}
      </g>
    </svg>
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
