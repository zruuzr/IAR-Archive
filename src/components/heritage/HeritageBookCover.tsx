import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { HERITAGE_CLOTHS } from './heritage-data';

export interface HeritageBookCoverProps {
  title: string;
  category?: string;
  year?: ReactNode;
  /** Cloth colour; defaults to lapis. See `pickCloth(bookId)` for a stable colour per book. */
  cloth?: string;
  /** Renders an <a>. */
  href?: string;
  /** Renders a <button> (when no `href`). */
  onClick?: () => void;
  /** Accessible name for the link/button. */
  label?: string;
  /** Heading element for the title (default `h3`; use `span` when a real <h2> is nearby). */
  titleAs?: 'h3' | 'h4' | 'span';
  className?: string;
}

/**
 * Cloth-bound book cover drawn in CSS: woven cloth, hinge, gilt frame, ribbon,
 * octagram medallion and gilt title plate. Use it as the fallback for books without
 * a `cover_image`, or as the spotlight "tome".
 */
export function HeritageBookCover({
  title,
  category,
  year,
  cloth = HERITAGE_CLOTHS[0],
  href,
  onClick,
  label,
  titleAs: Title = 'h3',
  className
}: HeritageBookCoverProps) {
  const style = { '--hx-cloth': cloth } as CSSProperties;
  const content = (
    <>
      <span className="hx-rib" aria-hidden="true" />
      {category ? <span className="hx-cov-cat">{category}</span> : <span />}
      <span className="hx-cov-medal" aria-hidden="true" />
      <Title className="hx-cov-title">{title}</Title>
      {year ? <span className="hx-cov-year">{year}</span> : <span />}
    </>
  );

  if (href) {
    return (
      <a
        className={cn('hx-cover', className)}
        style={style}
        href={href}
        aria-label={label}
      >
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        className={cn('hx-cover', className)}
        style={style}
        onClick={onClick}
        aria-label={label}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={cn('hx-cover', className)} style={style}>
      {content}
    </div>
  );
}
