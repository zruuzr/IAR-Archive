import { useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HERITAGE_CLOTHS } from './heritage-data';

export interface HeritageBookCoverProps {
  title: string;
  category?: string;
  year?: ReactNode;
  /** Cloth colour; defaults to lapis. See `pickCloth(bookId)` for a stable colour per book. */
  cloth?: string;
  /**
   * Real cover image (`book.cover_image`). It gets the same hinge and gilt edge as the
   * generated cover; if it fails to load, the generated cloth cover is shown instead.
   */
  image?: string;
  /** Small gilt pill over the image (e.g. "مميز" / "Featured"). */
  badge?: ReactNode;
  /** `lazy` for grids (default), `eager` for the above-the-fold cover of the details page. */
  loading?: 'lazy' | 'eager';
  /** Renders an <a>. */
  href?: string;
  /** Renders a <button> (when no `href`). */
  onClick?: () => void;
  /** Accessible name for the link/button. */
  label?: string;
  /**
   * Purely decorative copy of a book that is already named next to it (cards): hidden
   * from assistive tech, image `alt=""`, title rendered as a <span>.
   */
  decorative?: boolean;
  /** Heading element for the title (default `h3`; use `span` when a real <h2> is nearby). */
  titleAs?: 'h3' | 'h4' | 'span';
  /**
   * Keep the existing e2e hooks: `book-cover-img-{id}` (the <img>),
   * `book-cover-fallback-{id}` (generated cover) and `book-cover-btn-{id}` (`root`:
   * the link/button when the cover itself is clickable, e.g. on the details page).
   */
  testIds?: { image?: string; fallback?: string; root?: string };
  className?: string;
}

/**
 * Cloth-bound book cover: woven cloth, hinge, gilt frame and — when there is no image —
 * ribbon, octagram medallion and gilt title plate. With `image` it shows the real cover
 * in the same frame, so every book on the site shares one silhouette.
 */
export function HeritageBookCover({
  title,
  category,
  year,
  cloth = HERITAGE_CLOTHS[0],
  image,
  badge,
  loading = 'lazy',
  href,
  onClick,
  label,
  decorative = false,
  titleAs,
  testIds,
  className
}: HeritageBookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(image && failedSrc !== image);
  const Title = titleAs ?? (decorative ? 'span' : 'h3');
  const style = { '--hx-cloth': cloth } as CSSProperties;
  const classes = cn(
    'hx-cover',
    showImage ? 'hx-cover--image' : 'hx-cover--plain',
    className
  );

  const content = showImage ? (
    <>
      <img
        className="hx-cover-img"
        src={image}
        alt={decorative ? '' : title}
        loading={loading}
        decoding="async"
        data-testid={testIds?.image}
        onError={() => setFailedSrc(image ?? null)}
      />
      {badge ? <span className="hx-cov-badge">{badge}</span> : null}
    </>
  ) : (
    <>
      <span className="hx-rib" aria-hidden="true" />
      {category ? <span className="hx-cov-cat">{category}</span> : <span />}
      <span className="hx-cov-medal" aria-hidden="true" />
      <Title className="hx-cov-title">{title}</Title>
      {year ? <span className="hx-cov-year">{year}</span> : <span />}
    </>
  );

  const common = {
    className: classes,
    style,
    'aria-hidden': decorative ? true : undefined,
    'data-testid': testIds?.root ?? (showImage ? undefined : testIds?.fallback)
  } as const;

  if (href && !decorative) {
    return (
      <a {...common} href={href} aria-label={label}>
        {content}
      </a>
    );
  }
  if (onClick && !decorative) {
    return (
      <button type="button" {...common} onClick={onClick} aria-label={label}>
        {content}
      </button>
    );
  }
  return <div {...common}>{content}</div>;
}
