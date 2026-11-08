import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { HERITAGE_CLOTHS } from './heritage-data';

export interface HeritagePathway {
  key: string;
  label: string;
  count: number | string;
  /** One short line under the label. */
  blurb?: string;
  /** Accent colour of the octagram badge. */
  color?: string;
}

export interface PathwayGridProps {
  items: readonly HeritagePathway[];
  activeKey?: string;
  onSelect: (key: string) => void;
  /** Format the count (e.g. `formatNumber` from i18n). */
  formatCount?: (count: number | string) => ReactNode;
  className?: string;
}

/**
 * Knowledge pathways: cards with an octagram count badge and a faint star-tile
 * corner. Each card is a <button>; the active one gets `aria-pressed`.
 */
export function PathwayGrid({
  items,
  activeKey,
  onSelect,
  formatCount = (count) => count,
  className
}: PathwayGridProps) {
  return (
    <div className={cn('hx-paths', className)}>
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          data-testid={`category-chip-${item.key}`}
          className="hx-path"
          aria-pressed={activeKey === undefined ? undefined : activeKey === item.key}
          style={
            {
              '--hx-c': item.color ?? HERITAGE_CLOTHS[index % HERITAGE_CLOTHS.length]
            } as CSSProperties
          }
          onClick={() => onSelect(item.key)}
        >
          <span className="hx-path-n">{formatCount(item.count)}</span>
          <span className="hx-path-t">{item.label}</span>
          {item.blurb ? <span className="hx-path-d">{item.blurb}</span> : null}
          <span className="hx-path-arrow" aria-hidden="true">
            ←
          </span>
        </button>
      ))}
    </div>
  );
}
