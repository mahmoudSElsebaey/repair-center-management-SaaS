import { cn } from '@/lib/utils';

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
      <g fill="#304352">
        <path d="M8.2 18.1 4.8 15l4.1-4.1 3.1 3.4a17.5 17.5 0 0 1 5.1-2.1l.2-4.5h5.8l.2 4.5a17.5 17.5 0 0 1 5.1 2.1l3.1-3.4 4.1 4.1-3.4 3.1a17.5 17.5 0 0 1 2.1 5.1l4.5.2v5.8l-4.5.2a17.5 17.5 0 0 1-2.1 5.1l3.4 3.1-4.1 4.1-3.1-3.4a17.5 17.5 0 0 1-5.1 2.1l-.2 4.5h-5.8l-.2-4.5a17.5 17.5 0 0 1-5.1-2.1l-3.1 3.4-4.1-4.1 3.4-3.1a17.5 17.5 0 0 1-2.1-5.1l-4.5-.2v-5.8l4.5-.2a17.5 17.5 0 0 1 2.1-5.1Z"/>
      </g>
      <circle cx="22" cy="26" r="11" fill="var(--background)" />
      <path d="m14 17 20 22M34 17 14 39" stroke="#10B5AE" strokeWidth="5.2" strokeLinecap="square" />
      <path
        d="M31.3 9.2a7.4 7.4 0 0 0-8.8 9.1l-8.1 8.1a3 3 0 1 0 4.2 4.2l8.1-8.1a7.4 7.4 0 0 0 9.1-8.8l-4.1 3.3-3.6-1-1-3.6 4.2-3.2Z"
        fill="#10B5AE"
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
