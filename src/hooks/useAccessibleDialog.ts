import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

let openDialogCount = 0;
let savedBodyOverflow = '';

function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (openDialogCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openDialogCount += 1;
  document.body.setAttribute('data-open-dialogs', String(openDialogCount));

  let released = false;
  return () => {
    if (released || typeof document === 'undefined') return;
    released = true;
    openDialogCount = Math.max(0, openDialogCount - 1);
    if (openDialogCount === 0) {
      document.body.style.overflow = savedBodyOverflow;
      document.body.removeAttribute('data-open-dialogs');
    } else {
      document.body.setAttribute('data-open-dialogs', String(openDialogCount));
    }
  };
}

export interface UseAccessibleDialogOptions {
  open: boolean;
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Manages modal dialog accessibility:
 * - Reference-counted body scroll locking so sequential or nested modal transitions never leak `overflow: hidden`.
 * - Saves the previously focused trigger element and restores focus to it upon close.
 * - Moves focus inside the dialog when opened.
 * - Traps `Tab` and `Shift+Tab` keyboard navigation within the dialog container.
 * - Invokes `onEscape` when `Escape` is pressed.
 */
export function useAccessibleDialog<T extends HTMLElement = HTMLDivElement>({
  open,
  onEscape,
  initialFocusRef
}: UseAccessibleDialogOptions): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const onEscapeRef = useRef(onEscape);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const unlockScroll = lockBodyScroll();

    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container.focus();
      }
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onEscapeRef.current) {
          event.stopPropagation();
          onEscapeRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const container = containerRef.current;
      if (!container) return;

      const focusableNodes = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

      if (focusableNodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableNodes[0];
      const last = focusableNodes[focusableNodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !container.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        try {
          if (document.contains(previouslyFocused)) {
            previouslyFocused.focus();
          }
        } catch {
          // Ignore focus restoration errors on detached nodes
        }
      }
    };
  }, [open, initialFocusRef]);

  return containerRef;
}
