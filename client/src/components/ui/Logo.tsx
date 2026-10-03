import { cn } from '@/lib/utils';

/**
 * The RepairFlow wordmark and app mark.
 *
 * The glyph is drawn inline so it inherits `currentColor` and stays crisp at
 * every size, and the wordmark uses the brand gradient token rather than a
 * bitmap asset.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('h-9 w-9', className)}
    >
      <defs>
        <linearGradient id="rf-logo-gradient" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--secondary)" />
        </linearGradient>
      </defs>

      {/* Machined container with one cut corner — reads as a service badge */}
      <path
        d="M9 3h24l12 12v24a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6Z"
        fill="url(#rf-logo-gradient)"
        fillOpacity="0.16"
        stroke="url(#rf-logo-gradient)"
        strokeWidth="2"
      />

      {/* Flow path */}
      <path
        d="M14 31c0-8 6.5-13 14-13h3"
        stroke="url(#rf-logo-gradient)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Integrated wrench head */}
      <path
        d="M31.5 12.2a5.6 5.6 0 0 0-6.9 6.9l-9.4 9.4a2.6 2.6 0 1 0 3.7 3.7l9.4-9.4a5.6 5.6 0 0 0 6.9-6.9l-3.3 3.3-3.2-.9-.9-3.2 3.7-2.9Z"
        fill="url(#rf-logo-gradient)"
      />
    </svg>
  );
}

export interface LogoProps {
  /** `full` shows mark + wordmark; `mark` shows the glyph only. */
  variant?: 'full' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Rendered next to the wordmark, e.g. "Operations Console". */
  suffix?: string;
}

const MARK_SIZES = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
} as const;

const TEXT_SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

export function Logo({ variant = 'full', size = 'md', className, suffix }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={MARK_SIZES[size]} title={variant === 'mark' ? 'RepairFlow' : undefined} />

      {variant === 'full' && (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              'font-extrabold tracking-tight text-foreground',
              TEXT_SIZES[size],
              'rf-brand-text'
            )}
          >
            RepairFlow
          </span>
          {suffix && (
            <span className="mt-1 truncate text-2xs font-medium uppercase tracking-widest text-foreground-subtle">
              {suffix}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
