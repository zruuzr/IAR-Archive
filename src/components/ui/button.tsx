import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Heritage buttons: 10px radius, semibold Plex body, lapis (light) / gold (dark)
 * as the primary colour, gilt-edged outline, gold focus ring — the same
 * vocabulary as `.hx-btn` so shadcn buttons and heritage buttons read as one.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-transparent text-sm font-semibold transition-[background-color,border-color,color,filter] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hx-gold-bright)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:brightness-110',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[inset_0_-2px_0_rgba(0,0,0,0.18)] hover:brightness-110',
        outline:
          'border-input bg-card text-foreground hover:border-[var(--hx-gold)] hover:bg-accent',
        secondary:
          'bg-secondary text-secondary-foreground hover:border-[var(--hx-gold)] hover:text-foreground',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'text-[var(--hx-link)] underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        xs: 'h-7 rounded-[8px] px-2.5 text-xs',
        lg: 'h-10 px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-xs': 'size-7'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
