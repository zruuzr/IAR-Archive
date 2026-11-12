import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HeritageBookCover, type HeritageBookCoverProps } from './HeritageBookCover';
import { HeritageIconButton } from './controls';
import { HeritageIcon } from './icons';

export interface HeritageBookCardProps {
  /** Book title: it is the card's single real link/button (stretched over the whole card). */
  title: string;
  /** Opens the details page: pass `href` (real link) or `onOpen` (button). */
  href?: string;
  onOpen?: () => void;
  /** Accessible name when the visible title is not enough (rare). */
  titleLabel?: string;
  /** e2e hook for the title link, e.g. `book-title-link-{id}`. */
  titleTestId?: string;
  /** Cover: props for the built-in cover (decorative here), or your own node. */
  cover: HeritageBookCoverProps | ReactNode;
  /** Category, shown above the title. */
  kicker?: ReactNode;
  author?: ReactNode;
  /** Pages, size, type… (the last ones are hidden on phones). */
  meta?: readonly ReactNode[];
  /** Rating / downloads: `<HeritageRating />`, `<HeritageStat />`. */
  stats?: ReactNode;
  /**
   * Optional small zoom button over the cover (keeps the current site's "click the cover
   * to enlarge" behaviour). Without it the whole card, cover included, opens the details.
   */
  onZoomCover?: () => void;
  zoomLabel?: string;
  /** e2e hook for the zoom button, e.g. `book-cover-btn-{id}`. */
  zoomTestId?: string;
  /** Two-line summary, shown in list view only. */
  excerpt?: ReactNode;
  /**
   * Actions row. Recommended: ONE primary `HeritageButton size="sm"` (flex-grows),
   * then `HeritageFavButton`, then `<HeritageMoreMenu>` for everything secondary.
   */
  actions?: ReactNode;
  className?: string;
  /** e2e hook for the card, e.g. `book-card-{id}`. */
  testId?: string;
}

function isCoverProps(
  value: HeritageBookCardProps['cover']
): value is HeritageBookCoverProps {
  return typeof value === 'object' && value !== null && 'title' in value;
}

/**
 * Presentational book card. One link per card (the title); the cover, author and meta
 * are part of its hit area, while the action buttons stay independently clickable.
 * Put cards inside `<HeritageGrid>`.
 */
export function HeritageBookCard({
  title,
  href,
  onOpen,
  titleLabel,
  titleTestId,
  cover,
  kicker,
  author,
  meta,
  stats,
  excerpt,
  actions,
  onZoomCover,
  zoomLabel,
  zoomTestId,
  className,
  testId
}: HeritageBookCardProps) {
  // `book-card` / `book-title` are kept for the existing e2e selectors (`.book-card .book-title a`).
  return (
    <article className={cn('hx-card', 'book-card', className)} data-testid={testId}>
      <div className="hx-card-cover">
        {isCoverProps(cover) ? (
          <HeritageBookCover {...cover} href={undefined} onClick={undefined} decorative />
        ) : (
          cover
        )}
        {onZoomCover ? (
          <HeritageIconButton
            label={zoomLabel ?? title}
            size="sm"
            className="hx-card-zoom"
            data-testid={zoomTestId}
            onClick={onZoomCover}
          >
            <HeritageIcon name="zoom" size={18} />
          </HeritageIconButton>
        ) : null}
      </div>
      <div className="hx-card-body">
        {kicker ? <p className="hx-card-kicker">{kicker}</p> : null}
        <h3 className="hx-card-title book-title">
          {href ? (
            <a
              className="hx-card-link"
              href={href}
              aria-label={titleLabel}
              data-testid={titleTestId}
              onClick={
                onOpen
                  ? (event) => {
                      // Keep the real URL (open in new tab, copy link) but navigate in-app.
                      if (
                        event.button === 0 &&
                        !event.metaKey &&
                        !event.ctrlKey &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        onOpen();
                      }
                    }
                  : undefined
              }
            >
              {title}
            </a>
          ) : (
            <button
              type="button"
              className="hx-card-link"
              aria-label={titleLabel}
              data-testid={titleTestId}
              onClick={onOpen}
            >
              {title}
            </button>
          )}
        </h3>
        {author ? <p className="hx-by">{author}</p> : null}
        {meta && meta.length > 0 ? (
          <ul className="hx-meta">
            {meta.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        ) : null}
        {excerpt ? <p className="hx-excerpt">{excerpt}</p> : null}
        {stats ? <div className="hx-card-stats">{stats}</div> : null}
        {actions ? <div className="hx-actions">{actions}</div> : null}
      </div>
    </article>
  );
}

export interface HeritageRatingProps {
  /** Average, 0–5. Hidden when there are no ratings. */
  value: number;
  count?: number;
  /** Accessible text, e.g. "التقييم 4.6 من 5 (12)". */
  label: string;
}

/** Compact read-only rating: one octagram, the average and the count. */
export function HeritageRating({ value, count, label }: HeritageRatingProps) {
  if (!(value > 0)) return null;
  return (
    <span className="hx-stat hx-stat--rating" role="img" aria-label={label}>
      <HeritageIcon name="octagram" size={15} />
      <b>{value.toFixed(1)}</b>
      {count ? <span className="hx-stat-n">({count})</span> : null}
    </span>
  );
}

export interface HeritageStatProps {
  icon: 'download-count' | 'users';
  value: ReactNode;
  label: string;
}

/** Small icon + number (downloads, readers…). */
export function HeritageStat({ icon, value, label }: HeritageStatProps) {
  return (
    <span className="hx-stat" role="img" aria-label={label}>
      <HeritageIcon name={icon} size={15} />
      <span>{value}</span>
    </span>
  );
}

export interface HeritageGridProps {
  children: ReactNode;
  /** List layout instead of cards. */
  list?: boolean;
  className?: string;
  testId?: string;
  'data-view-mode'?: string;
}

export function HeritageGrid({
  children,
  list = false,
  className,
  testId,
  'data-view-mode': dataViewMode
}: HeritageGridProps) {
  return (
    <div
      data-testid={testId}
      data-view-mode={dataViewMode}
      className={cn('hx-grid', list && 'hx-is-list', className)}
    >
      {children}
    </div>
  );
}
