import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { OCTAGRAM_RATIO, starPoints } from './heritage-data';

/** Gold diamond/lozenge band (Abbasid frieze). Decorative. */
export function HeritageFrieze({
  className,
  testId,
  'data-testid': dataTestId
}: {
  className?: string;
  testId?: string;
  'data-testid'?: string;
}) {
  return (
    <div
      className={cn('hx-frieze', className)}
      aria-hidden="true"
      data-testid={dataTestId || testId}
    />
  );
}

/** Hairline — eight-point star — hairline divider used under section titles. */
export function HeritageOrnament({ className }: { className?: string }) {
  return (
    <div className={cn('hx-orn', className)} aria-hidden="true">
      <span />
      <i />
      <span />
    </div>
  );
}

/** Stepped (ziggurat) edge that joins the dark hero to the page background. */
export function HeritageSteps({ className }: { className?: string }) {
  return <div className={cn('hx-hero-steps', className)} aria-hidden="true" />;
}

export interface HeritageLogoProps {
  className?: string;
  size?: number;
}

/** Brand mark: lapis octagram, gold ring, cuneiform wedge. */
export function HeritageLogo({ className, size = 44 }: HeritageLogoProps) {
  return (
    <svg
      viewBox="-24 -24 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <polygon
        points="0,-22 5.9,-15.7 14.4,-16.6 15.7,-8.8 22,0 15.7,8.8 14.4,16.6 5.9,15.7 0,22 -5.9,15.7 -14.4,16.6 -15.7,8.8 -22,0 -15.7,-8.8 -14.4,-16.6 -5.9,-15.7"
        fill="#17399a"
        stroke="#c9992e"
        strokeWidth="1.6"
      />
      <circle r="12.5" fill="none" stroke="#e2b84e" strokeWidth="1" />
      <path
        d="M-5,-8 H5 L0,-1.5Z M0,-1.5 V9"
        stroke="#f1d27a"
        strokeWidth="2.2"
        fill="#f1d27a"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface HeritageSectionHeadProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  titleId?: string;
  className?: string;
}

/** Centered section heading: eyebrow, serif title, ornament, optional subtitle. */
export function HeritageSectionHead({
  eyebrow,
  title,
  subtitle,
  titleId,
  className
}: HeritageSectionHeadProps) {
  return (
    <header className={cn('hx-sec-head', className)}>
      {eyebrow ? <p className="hx-eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId}>{title}</h2>
      <HeritageOrnament />
      {subtitle ? <p className="hx-sec-sub">{subtitle}</p> : null}
    </header>
  );
}

export type HeritageButtonVariant = 'gold' | 'ghost' | 'solid' | 'line';

export interface HeritageButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  variant?: HeritageButtonVariant;
  size?: 'md' | 'sm';
  className?: string;
  'data-testid'?: string;
}

/** Button in the heritage style. `gold`/`ghost` are for the dark hero, `solid`/`line` for light surfaces. */
export function HeritageButton({
  variant = 'solid',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: HeritageButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'hx-btn',
        `hx-btn-${variant}`,
        size === 'sm' && 'hx-btn-sm',
        className
      )}
      {...rest}
    />
  );
}

export interface HeritageFavButtonProps {
  pressed: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
  testId?: string;
  'data-testid'?: string;
}

/** Octagram favourite toggle. */
export function HeritageFavButton({
  pressed,
  onToggle,
  labelOn,
  labelOff,
  testId,
  'data-testid': dataTestId
}: HeritageFavButtonProps) {
  return (
    <button
      type="button"
      className="hx-fav"
      aria-pressed={pressed}
      aria-label={pressed ? labelOn : labelOff}
      title={pressed ? labelOn : labelOff}
      onClick={onToggle}
      data-testid={dataTestId || testId}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <polygon points={starPoints(12, 12, 11, 11 * OCTAGRAM_RATIO)} />
      </svg>
    </button>
  );
}
