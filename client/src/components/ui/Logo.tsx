import { cn } from '@/lib/utils';

/**
 * Fixer brand mark — gear + wrench “X” (teal accent on slate).
 * Matches the official Fixer wordmark: Fi + X + er.
 */
function FixerMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn('h-9 w-9', className)}
    >
      {/* Gear ring (slate) */}
      <path
        fill="#304352"
        d="M24 6.5c.9 0 1.7.1 2.5.3l.9-2.6 3.6 1.2-.7 2.7c1.4.6 2.6 1.5 3.6 2.6l2.6-1.2 2.4 3-2.2 1.8c.7 1.3 1.1 2.7 1.2 4.2h3v3.8h-3c-.1 1.5-.5 2.9-1.2 4.2l2.2 1.8-2.4 3-2.6-1.2c-1 1.1-2.2 2-3.6 2.6l.7 2.7-3.6 1.2-.9-2.6c-.8.2-1.6.3-2.5.3s-1.7-.1-2.5-.3l-.9 2.6-3.6-1.2.7-2.7c-1.4-.6-2.6-1.5-3.6-2.6l-2.6 1.2-2.4-3 2.2-1.8c-.7-1.3-1.1-2.7-1.2-4.2h-3V19.6h3c.1-1.5.5-2.9 1.2-4.2l-2.2-1.8 2.4-3 2.6 1.2c1-1.1 2.2-2 3.6-2.6l-.7-2.7 3.6-1.2.9 2.6c.8-.2 1.6-.3 2.5-.3Z"
      />
      {/* Inner disc (follows theme background) */}
      <circle cx="24" cy="24" r="11.5" fill="var(--background, #fff)" />
      {/* Secondary gear teeth hint */}
      <circle cx="24" cy="24" r="9" stroke="#304352" strokeWidth="1.6" fill="none" opacity="0.35" />
      {/* Wrench forming the X — teal */}
      <path
        fill="#10B5AE"
        d="M31.8 9.4a6.6 6.6 0 0 0-8.2 8.1L14.2 27a2.7 2.7 0 1 0 3.8 3.8l9.4-9.4a6.6 6.6 0 0 0 8.1-8.2l-3.7 2.9-3.2-.9-.9-3.2 3.1-2.6Z"
      />
      {/* Crossing stroke of the X */}
      <path
        stroke="#10B5AE"
        strokeWidth="4.6"
        strokeLinecap="round"
        d="M15.5 15.5 32.5 32.5"
      />
    </svg>
  );
}

export interface LogoProps {
  /** `full` shows the Fixer wordmark; `mark` shows the symbol only. */
  variant?: 'full' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Rendered below the wordmark, e.g. the product tagline. */
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
      {variant === 'mark' ? (
        <FixerMark className={MARK_SIZES[size]} title="Fixer" />
      ) : (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              'inline-flex items-center font-extrabold tracking-tight text-foreground',
              TEXT_SIZES[size],
              'rf-brand-text'
            )}
            aria-label="Fixer"
          >
            <span>Fi</span>
            <FixerMark className="mx-0.5 h-[1.05em] w-[1.05em]" />
            <span>er</span>
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
