import type { ReactNode } from 'react';
import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

export type HeritageIconName =
  | 'download'
  | 'read'
  | 'quote'
  | 'share'
  | 'bundle'
  | 'summary'
  | 'more'
  | 'arrow-start'
  | 'arrow-end'
  | 'check'
  | 'copy'
  | 'download-count'
  | 'users'
  | 'zoom'
  | 'octagram';

const PATHS: Record<HeritageIconName, ReactNode> = {
  download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />,
  read: (
    <>
      <path d="M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1Z" />
      <path d="M12 6.5V20" />
    </>
  ),
  quote: <path d="M7 7h4v4c0 3-1.5 4.5-4 5M14 7h4v4c0 3-1.5 4.5-4 5" />,
  share: <path d="M12 15V4m-4 4 4-4 4 4M5 13v6h14v-6" />,
  bundle: <path d="m4 8 8-4 8 4-8 4-8-4Zm0 4 8 4 8-4M4 16l8 4 8-4" />,
  summary: <path d="M5 6h14M5 11h14M5 16h9" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  // Points to the inline-start side in RTL (right) and flips automatically in LTR.
  'arrow-start': <path d="M5 12h14m-5-5 5 5-5 5" />,
  'arrow-end': <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  copy: <path d="M9 9h11v11H9zM5 15V4h10" />,
  'download-count': <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />,
  zoom: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5" />
    </>
  ),
  octagram: <polygon points={starPoints(12, 12, 10.5, 10.5 * OCTAGRAM_RATIO)} />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.3 2.7-5 5.5-5s4.9 1.7 5.5 5M16 6a3 3 0 0 1 0 5.6M17.5 14.3c1.7.6 2.7 2.2 3 4.7" />
    </>
  )
};

export interface HeritageIconProps {
  name: HeritageIconName;
  size?: number;
  className?: string;
}

/** Small stroke icon set used by the heritage components (decorative: always `aria-hidden`). */
export function HeritageIcon({ name, size = 18, className }: HeritageIconProps) {
  // The base "arrow" points right. In RTL, "start" is right (as drawn); in LTR it flips.
  // "end" is the opposite. See `.hx-ico-start` / `.hx-ico-end` in heritage-books.css.
  const direction =
    name === 'arrow-start'
      ? 'hx-ico-start'
      : name === 'arrow-end'
        ? 'hx-ico-end'
        : name === 'octagram'
          ? 'hx-ico-fillable'
          : '';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={['hx-ico', direction, className].filter(Boolean).join(' ')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
