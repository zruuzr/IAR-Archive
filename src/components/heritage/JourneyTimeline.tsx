import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { JourneyIcon, JourneyItem } from './heritage-data';

const ICONS: Record<JourneyIcon, ReactNode> = {
  tablet: (
    <>
      <rect x="10" y="7" width="28" height="34" rx="5" />
      <path d="M17 17l5 2.5M17 24l5 2.5M17 31l5 2.5M28 17v5M28 26v5" />
    </>
  ),
  stele: (
    <>
      <path d="M14 43V17Q14 6 24 6Q34 6 34 17V43Z" />
      <path d="M14 23H34M14 29H34M14 35H34" />
      <circle cx="24" cy="15" r="2.5" />
    </>
  ),
  library: (
    <>
      <rect x="8" y="30" width="32" height="9" rx="2" />
      <rect x="11" y="19" width="26" height="9" rx="2" />
      <rect x="14" y="8" width="20" height="9" rx="2" />
    </>
  ),
  dome: (
    <>
      <path d="M8 42V27Q8 11 24 5Q40 11 40 27V42" />
      <path d="M17 42V31Q17 24 24 21Q31 24 31 31V42" />
    </>
  ),
  book: (
    <>
      <path d="M10 8h24a4 4 0 0 1 4 4v28H14a4 4 0 0 1-4-4Z" />
      <path d="M10 36a4 4 0 0 1 4-4h24M18 16h14M18 22h10" />
    </>
  )
};

export interface JourneyTimelineProps {
  items: readonly JourneyItem[];
  className?: string;
}

/** Five-step timeline: octagram nodes on a dashed line (vertical on small screens). */
export function JourneyTimeline({ items, className }: JourneyTimelineProps) {
  return (
    <ol className={cn('hx-timeline', className)}>
      {items.map((item) => (
        <li key={item.title} className="hx-tl">
          <div className="hx-tl-node">
            <svg viewBox="0 0 48 48" aria-hidden="true">
              {ICONS[item.icon]}
            </svg>
          </div>
          <p className="hx-tl-era">{item.era}</p>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      ))}
    </ol>
  );
}
