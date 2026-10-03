import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  /** Renders an icon before the label, mirrored automatically in RTL. */
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-elevated text-foreground border border-border hover:bg-elevated-hover shadow-xs',
  outline: 'border border-border-strong bg-transparent text-foreground hover:bg-surface-hover',
  ghost: 'bg-transparent text-foreground-muted hover:bg-surface-hover hover:text-foreground',
  danger: 'bg-danger text-danger-foreground shadow-sm hover:bg-danger-hover',
  success: 'bg-success text-success-foreground shadow-sm hover:bg-success-hover',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto',
};

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-sm',
  sm: 'h-9 px-3.5 text-sm gap-2 rounded-md',
  md: 'h-11 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
  icon: 'h-10 w-10 rounded-lg',
  'icon-sm': 'h-8 w-8 rounded-md',
};

/**
 * The single button in the system. Every variant is token-driven, so both
 * themes and all four brand accents stay consistent without per-screen styling.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    disabled,
    type = 'button',
    children,
    ...props
  },
  ref
) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-soft',
        'active:scale-[0.985]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        leadingIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leadingIcon}
          </span>
        )
      )}
      {children}
      {trailingIcon && !isLoading && (
        <span className="shrink-0 rf-flip-rtl" aria-hidden="true">
          {trailingIcon}
        </span>
      )}
    </button>
  );
});
