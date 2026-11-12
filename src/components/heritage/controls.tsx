import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from 'react';
import { cn } from '@/lib/utils';
import { HeritageIcon } from './icons';

export interface HeritageIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'aria-label' | 'title'
> {
  /** Required: icon-only buttons need an accessible name (also used as the tooltip). */
  label: string;
  pressed?: boolean;
  /** `sm` = 38px (cards), `md` = 46px round (details hero). */
  size?: 'sm' | 'md';
  /** Hide below 640px (card actions that move into the "more" menu on phones). */
  hideOnPhone?: boolean;
  className?: string;
  children: ReactNode;
}

/** Square/round icon-only button. Pass a `<HeritageIcon />` as the child. */
export function HeritageIconButton({
  label,
  pressed,
  size = 'sm',
  hideOnPhone = false,
  className,
  type = 'button',
  children,
  ...rest
}: HeritageIconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'hx-icon-btn',
        `hx-icon-btn--${size}`,
        hideOnPhone && 'hx-hide-sm',
        className
      )}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface HeritageMoreMenuProps {
  /** Accessible name of the "⋯" trigger, e.g. "المزيد من الإجراءات". */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Overflow menu for secondary actions (cite, summary, share, bundle…), so a card keeps
 * one primary action. Built on `<details>`: keyboard/AT friendly with no extra roles;
 * closes on outside click, Escape, or after choosing an item.
 */
export function HeritageMoreMenu({ label, children, className }: HeritageMoreMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (el.open && event.target instanceof Node && !el.contains(event.target)) {
        el.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && el.open) {
        el.open = false;
        el.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const closeAfterChoice = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target instanceof Element && event.target.closest('button, a')) {
      ref.current?.removeAttribute('open');
    }
  };

  return (
    <details ref={ref} className={cn('hx-more', className)}>
      <summary className="hx-icon-btn hx-icon-btn--sm" aria-label={label} title={label}>
        <HeritageIcon name="more" size={20} />
      </summary>
      {/* Clicks bubble from the menu items; closing is a convenience, not an interaction. */}
      <div className="hx-more-pop" onClick={closeAfterChoice}>
        {children}
      </div>
    </details>
  );
}

export interface HeritageMenuItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  icon?: ReactNode;
  pressed?: boolean;
  /** Only show on phones (for actions whose icon button is hidden there). */
  phoneOnly?: boolean;
}

export function HeritageMenuItem({
  icon,
  pressed,
  phoneOnly = false,
  type = 'button',
  children,
  ...rest
}: HeritageMenuItemProps) {
  return (
    <button
      type={type}
      className={cn('hx-menu-item', phoneOnly && 'hx-show-sm')}
      aria-pressed={pressed}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
