import { flushSync } from 'react-dom';

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<unknown> };
};

/** True when the visitor asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Opens a book with the cover travelling from the clicked card into the niche
 * (View Transitions API). Everywhere it is not supported — or when the visitor prefers
 * reduced motion — it just calls `update()`, so it is always safe to use.
 *
 * `source` is the cover element of the clicked card (`.hx-card-cover` or the card
 * itself); `update` must change the screen (navigate to `?book=ID`, set state…). It is
 * wrapped in `flushSync`, so the new page is in the DOM before the browser captures it.
 *
 *   onOpen={(event) => openWithCover(event.currentTarget.closest('.hx-card'), () => open(id))}
 */
export function openWithCover(source: Element | null, update: () => void): void {
  const doc: ViewTransitionDocument | undefined =
    typeof document === 'undefined' ? undefined : document;
  const cover = source?.querySelector<HTMLElement>('.hx-cover') ?? null;

  if (!doc?.startViewTransition || !cover || prefersReducedMotion()) {
    update();
    return;
  }

  cover.style.viewTransitionName = 'hx-cover';
  const transition = doc.startViewTransition(() => {
    flushSync(update);
    cover.style.viewTransitionName = '';
  });
  void transition.finished.finally(() => {
    cover.style.viewTransitionName = '';
  });
}
