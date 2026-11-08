import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { HeritageBookCover, type HeritageBookCoverProps } from './HeritageBookCover';

export interface HeritageBookCardProps {
  /** Cover: props for the built-in cloth cover, or your own node (e.g. a real <img> cover). */
  cover: HeritageBookCoverProps | ReactNode;
  title?: ReactNode;
  author?: ReactNode;
  /** First item is highlighted as the book type; the rest are plain meta (pages, size…). */
  meta?: readonly ReactNode[];
  rating?: ReactNode;
  description?: ReactNode;
  /** Buttons row: `HeritageButton size="sm"`, `HeritageFavButton`… (the last child sticks to the end). */
  actions?: ReactNode;
  className?: string;
  /** Extra attributes for tests / filtering (e.g. data-testid). */
  testId?: string;
  'data-testid'?: string;
  'data-book-id'?: number | string;
  'data-cloth'?: string;
}

function isCoverProps(
  value: HeritageBookCardProps['cover']
): value is HeritageBookCoverProps {
  return typeof value === 'object' && value !== null && 'title' in value;
}

/**
 * Presentational book card: cover on top, author, meta line and an actions row.
 * Put it inside `<HeritageGrid>`; the grid switches between cards and a list.
 */
export function HeritageBookCard({
  cover,
  title,
  author,
  meta,
  rating,
  description,
  actions,
  className,
  testId,
  'data-testid': dataTestId,
  'data-book-id': dataBookId,
  'data-cloth': dataCloth
}: HeritageBookCardProps) {
  return (
    <article
      className={cn('hx-card', 'book-card', className)}
      data-testid={dataTestId || testId}
      data-book-id={dataBookId}
      data-cloth={dataCloth}
    >
      {isCoverProps(cover) ? <HeritageBookCover {...cover} /> : cover}
      <div className="hx-card-body">
        {title ? (
          <h3 className="book-title hx-card-title font-serif text-[15px] sm:text-[1.12rem] font-bold text-foreground leading-[1.42]">
            {title}
          </h3>
        ) : null}
        {author ? <p className="hx-by">{author}</p> : null}
        {meta && meta.length > 0 ? (
          <p className="hx-meta">
            {meta.map((item, index) => (
              <span key={index} className={index === 0 ? 'hx-type' : undefined}>
                {item}
              </span>
            ))}
          </p>
        ) : null}
        {rating ? <div className="hx-rating">{rating}</div> : null}
        {description ? (
          <p className="hx-desc text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        ) : null}
        {actions ? <div className="hx-actions">{actions}</div> : null}
      </div>
    </article>
  );
}

export interface HeritageGridProps {
  children: ReactNode;
  /** List layout instead of cards. */
  list?: boolean;
  className?: string;
  id?: string;
  testId?: string;
  'data-testid'?: string;
  'data-view-mode'?: string;
}

export function HeritageGrid({
  children,
  list = false,
  className,
  id,
  testId,
  'data-testid': dataTestId,
  'data-view-mode': dataViewMode
}: HeritageGridProps) {
  return (
    <div
      id={id}
      data-testid={dataTestId || testId}
      data-view-mode={dataViewMode || (list ? 'list' : 'grid')}
      className={cn('hx-grid', list && 'is-list hx-is-list', className)}
    >
      {children}
    </div>
  );
}
