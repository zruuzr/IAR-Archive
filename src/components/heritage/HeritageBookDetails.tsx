import type { ReactNode } from 'react';
import { HeritageIcon } from './icons';
import { HeritageIconButton } from './controls';
import { NicheArt } from './NicheArt';
import { HeritageSectionHead, HeritageSteps } from './ornaments';

export interface HeritageBookFact {
  label: string;
  value: ReactNode;
  /** Numbers / file sizes: force left-to-right so "9.63 MB" does not flip in RTL. */
  ltr?: boolean;
}

export interface HeritageBookNeighbor {
  title: string;
  onClick: () => void;
  href?: string;
}

export interface HeritageBookDetailsLabels {
  back: string;
  /** Shown before the id in the breadcrumb, e.g. "مرجع" / "Reference". */
  referenceNo: string;
  about: string;
  keyPoints: string;
  keywords: string;
  audience: string;
  citation: string;
  copy: string;
  copied: string;
  previous: string;
  next: string;
  related: string;
  zoomCover: string;
}

export interface HeritageBookDetailsProps {
  id: number | string;
  title: string;
  /** Title in the other language (small, under the title). */
  subtitle?: string;
  /** Text direction of `subtitle` (the opposite of the page language). */
  subtitleDir?: 'ltr' | 'rtl';
  category?: string;
  type?: string;
  /** Gilt pill next to the category (e.g. "مرجع معتمد"). */
  badge?: string;
  /** "تأليف" prefix + name, and the publisher on the same line. */
  authorLabel?: string;
  author?: string;
  publisher?: string;
  /** Year / pages / format & size… shown as a hairline strip under the title. */
  facts: readonly HeritageBookFact[];
  description: string;
  keyPoints: readonly string[];
  keywords?: readonly string[];
  /** Click a keyword to search for it. Without it, keywords are plain tags. */
  onKeyword?: (keyword: string) => void;
  audience?: string;

  /** APA text, copy state and handler (the host owns the clipboard/toast logic). */
  citation: string;
  citationCopied?: boolean;
  onCopyCitation: () => void;

  /** `<HeritageBookCover image … onClick={zoom} />` — it is placed inside the niche. */
  cover: ReactNode;
  /** Opens the full-size cover; renders the small zoom button on the niche. */
  onZoomCover?: () => void;
  /** Primary buttons (hero variants): read (`gold`), download (`ghost`). */
  actions: ReactNode;
  /** Round icon buttons: favourite, bundle, share, cite — `<HeritageIconButton size="md">`. */
  tools?: ReactNode;

  /** Interactive stars (the host's `RatingStars`) and the label next to them. */
  rating?: ReactNode;
  ratingLabel?: string;
  /** Downloads, favourites… (only real numbers). */
  metrics?: readonly { label: string; value: ReactNode }[];
  /** Replaces the verification panel: a short stamp (not the big seals panel). */
  stamp?: { title: string; text: string; art?: ReactNode };

  onBack: () => void;
  previous?: HeritageBookNeighbor;
  next?: HeritageBookNeighbor;
  /** `<HeritageGrid>` of `<HeritageBookCard>` (e.g. same category). */
  related?: ReactNode;
  labels: HeritageBookDetailsLabels;
}

/**
 * Book details page (`?book=ID`): a lapis hero with the cover standing in a mihrab niche,
 * a facts strip and the primary actions; below, the abstract, numbered key points and
 * keywords on one side, and APA citation / rating / stamp on the other; then
 * previous–next with the neighbouring titles, and related books.
 *
 * It keeps the e2e hooks of the current page (`book-details-view`, `single-book-title`,
 * `single-book-keypoints`, `single-book-apa`, `single-copy-apa-box-btn`,
 * `back-to-library-btn`, `single-prev-book-btn`, `single-next-book-btn`,
 * `heritage-verification-seals`, `single-zoom-cover-btn`). Pass `data-testid`s of the
 * buttons inside `actions` / `tools` yourself.
 */
export function HeritageBookDetails({
  id,
  title,
  subtitle,
  subtitleDir = 'ltr',
  category,
  type,
  badge,
  authorLabel,
  author,
  publisher,
  facts,
  description,
  keyPoints,
  keywords,
  onKeyword,
  audience,
  citation,
  citationCopied = false,
  onCopyCitation,
  cover,
  onZoomCover,
  actions,
  tools,
  rating,
  ratingLabel,
  metrics,
  stamp,
  onBack,
  previous,
  next,
  related,
  labels
}: HeritageBookDetailsProps) {
  const code = String(id).padStart(3, '0');

  return (
    <section
      id="singleBookView"
      className="hx-bd"
      aria-labelledby="singleBookTitle"
      data-testid="book-details-view"
    >
      <div className="hx-bd-hero">
        <div className="hx-wrap">
          <div className="hx-bd-bar">
            <button
              type="button"
              id="btnBackToList"
              className="hx-bd-back"
              data-testid="back-to-library-btn"
              onClick={onBack}
            >
              <HeritageIcon name="arrow-start" size={18} />
              <span>{labels.back}</span>
            </button>
            <span className="hx-bd-crumb" aria-hidden="true">
              {labels.referenceNo} {code}
            </span>
          </div>

          <div className="hx-bd-grid">
            <NicheArt
              overlay={
                onZoomCover ? (
                  <HeritageIconButton
                    label={labels.zoomCover}
                    size="sm"
                    className="hx-niche-zoom"
                    data-testid="single-zoom-cover-btn"
                    onClick={onZoomCover}
                  >
                    <HeritageIcon name="zoom" size={18} />
                  </HeritageIconButton>
                ) : null
              }
            >
              {cover}
            </NicheArt>

            <div className="hx-bd-info">
              <p className="hx-bd-eyebrow">
                {category ? <span id="singleBookCategory">{category}</span> : null}
                {type ? <span id="singleBookType">{type}</span> : null}
                {badge ? <span className="hx-bd-badge">{badge}</span> : null}
              </p>
              <h1
                id="singleBookTitle"
                className="hx-bd-title"
                data-testid="single-book-title"
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="hx-bd-sub" dir={subtitleDir}>
                  {subtitle}
                </p>
              ) : null}
              {author || publisher ? (
                <p className="hx-bd-author">
                  {author ? (
                    <>
                      {authorLabel ? (
                        <span className="hx-bd-dim">{authorLabel} </span>
                      ) : null}
                      <strong id="singleBookAuthor">{author}</strong>
                    </>
                  ) : null}
                  {publisher && publisher !== author ? (
                    <span className="hx-bd-dim">
                      {author ? ' · ' : ''}
                      {publisher}
                    </span>
                  ) : null}
                </p>
              ) : null}

              {facts.length > 0 ? (
                <dl className="hx-bd-facts">
                  {facts.map((fact) => (
                    <div key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.ltr ? <bdi dir="ltr">{fact.value}</bdi> : fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              <div className="hx-bd-actions">
                {actions}
                {tools ? <div className="hx-bd-tools">{tools}</div> : null}
              </div>
            </div>
          </div>
        </div>
        <HeritageSteps />
      </div>

      <div className="hx-bd-body">
        <div className="hx-wrap">
          <div className="hx-bd-cols">
            <div className="hx-bd-main">
              <div className="hx-bd-block">
                <h2 className="hx-bd-h">{labels.about}</h2>
                <p id="singleBookDescription" className="hx-bd-lead">
                  {description}
                </p>
              </div>

              {keyPoints.length > 0 ? (
                <div className="hx-bd-block">
                  <h2 className="hx-bd-h">{labels.keyPoints}</h2>
                  <ol
                    id="singleBookKeyPoints"
                    className="hx-bd-points"
                    data-testid="single-book-keypoints"
                  >
                    {keyPoints.map((point, index) => (
                      <li key={index}>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {audience ? (
                <div className="hx-bd-block">
                  <h2 className="hx-bd-h">{labels.audience}</h2>
                  <p id="singleBookAudience" className="hx-bd-note">
                    {audience}
                  </p>
                </div>
              ) : null}

              {keywords && keywords.length > 0 ? (
                <div className="hx-bd-block">
                  <h2 className="hx-bd-h">{labels.keywords}</h2>
                  <ul className="hx-bd-chips">
                    {keywords.map((keyword) => (
                      <li key={keyword}>
                        {onKeyword ? (
                          <button
                            type="button"
                            className="hx-bd-chip"
                            onClick={() => onKeyword(keyword)}
                          >
                            {keyword}
                          </button>
                        ) : (
                          <span className="hx-bd-chip hx-bd-chip--static">{keyword}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <aside className="hx-bd-aside">
              <div className="hx-bd-card">
                <h2 className="hx-bd-h">
                  <HeritageIcon name="quote" size={16} />
                  <span>{labels.citation}</span>
                </h2>
                <pre dir="auto" className="hx-bd-cite" data-testid="single-book-apa">
                  {citation}
                </pre>
                <button
                  type="button"
                  className="hx-bd-copy"
                  data-copied={citationCopied}
                  data-testid="single-copy-apa-box-btn"
                  onClick={onCopyCitation}
                >
                  <HeritageIcon name={citationCopied ? 'check' : 'copy'} size={16} />
                  <span>{citationCopied ? labels.copied : labels.copy}</span>
                </button>

                {rating ? (
                  <div className="hx-bd-rating">
                    {ratingLabel ? (
                      <span className="hx-bd-rating-label">{ratingLabel}</span>
                    ) : null}
                    {rating}
                  </div>
                ) : null}

                {metrics && metrics.length > 0 ? (
                  <dl className="hx-bd-metrics">
                    {metrics.map((metric) => (
                      <div key={metric.label}>
                        <dt>{metric.label}</dt>
                        <dd>{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {stamp ? (
                  <div className="hx-bd-stamp" data-testid="heritage-verification-seals">
                    {stamp.art ?? <i aria-hidden="true" />}
                    <span>
                      <b>{stamp.title}</b>
                      {stamp.text}
                    </span>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>

          {previous || next ? (
            <nav className="hx-bd-nav" aria-label={`${labels.previous} / ${labels.next}`}>
              {previous ? (
                <button
                  type="button"
                  className="hx-bd-link"
                  data-side="previous"
                  data-testid="single-prev-book-btn"
                  onClick={previous.onClick}
                >
                  <small>
                    <HeritageIcon name="arrow-start" size={15} />
                    {labels.previous}
                  </small>
                  <strong>{previous.title}</strong>
                </button>
              ) : (
                <span />
              )}
              {next ? (
                <button
                  type="button"
                  className="hx-bd-link"
                  data-side="next"
                  data-testid="single-next-book-btn"
                  onClick={next.onClick}
                >
                  <small>
                    {labels.next}
                    <HeritageIcon name="arrow-end" size={15} />
                  </small>
                  <strong>{next.title}</strong>
                </button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>
      </div>

      {related ? (
        <section className="hx-bd-related" aria-labelledby="hx-related-h">
          <div className="hx-wrap">
            <HeritageSectionHead title={labels.related} titleId="hx-related-h" />
            {related}
          </div>
        </section>
      ) : null}
    </section>
  );
}
