import { cn } from '@/lib/utils';

/**
 * Fixer brand mark — dark slate gear + teal wrench “X”.
 * Matches the official wordmark: Fi + (X mark) + er.
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
      {/* Gear (slate) */}
      <path
        fill="#304352"
        d="M24 5c1.1 0 2.1.12 3.1.36l.85-2.55 3.7 1.25-.7 2.6a14.5 14.5 0 0 1 4.1 2.95l2.55-1.15 2.45 3.1-2.2 1.75c.55 1.25.9 2.6 1.05 4h3.05v3.9h-3.05c-.15 1.4-.5 2.75-1.05 4l2.2 1.75-2.45 3.1-2.55-1.15a14.5 14.5 0 0 1-4.1 2.95l.7 2.6-3.7 1.25-.85-2.55c-1 .24-2 .36-3.1.36s-2.1-.12-3.1-.36l-.85 2.55-3.7-1.25.7-2.6a14.5 14.5 0 0 1-4.1-2.95l-2.55 1.15-2.45-3.1 2.2-1.75c-.55-1.25-.9-2.6-1.05-4H5.2v-3.9h3.05c.15-1.4.5-2.75 1.05-4l-2.2-1.75 2.45-3.1 2.55 1.15a14.5 14.5 0 0 1 4.1-2.95l-.7-2.6 3.7-1.25.85 2.55c1-.24 2-.36 3.1-.36z"
      />
      <circle cx="24" cy="24" r="11" fill="var(--background, #ffffff)" />
      <circle cx="24" cy="24" r="8.5" fill="none" stroke="#304352" strokeWidth="1.4" opacity="0.4" />
      {/* Wrench / X (teal) */}
      <path
        fill="#12C4B5"
        d="M33.2 10.2a6.2 6.2 0 0 0-8.5 7.2L15.2 26.9a2.55 2.55 0 1 0 3.6 3.6l9.5-9.5a6.2 6.2 0 0 0 7.2-8.5l-3.4 2.6-2.9-.8-.8-2.9 2.8-2.2z"
      />
      <path
        stroke="#12C4B5"
        strokeWidth="4.2"
        strokeLinecap="round"
        d="M16 16.2 32.2 32.4"
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
