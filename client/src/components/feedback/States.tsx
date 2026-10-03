import { Check, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Primary call to action. */
  action?: React.ReactNode;
  /** Secondary action, rendered alongside the primary. */
  secondaryAction?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'py-8 px-4',
  md: 'py-14 px-6',
  lg: 'py-20 px-6',
} as const;

/**
 * Empty state with a technical backdrop.
 *
 * Every list, table and dashboard panel uses this so an empty screen always
 * explains itself and offers a next step instead of showing blank space.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rf-tech-grid relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border text-center',
        SIZE_CLASSES[size],
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background"
        aria-hidden="true"
      />

      <div className="relative flex flex-col items-center">
        {icon && (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface text-foreground-subtle shadow-sm">
            {icon}
          </div>
        )}

        <h3 className="text-base font-semibold text-foreground">{title}</h3>

        {description && (
          <p className="mt-1.5 max-w-md text-sm text-foreground-muted">{description}</p>
        )}

        {(action || secondaryAction) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** Shown under the message — used for support codes, never raw stack traces. */
  detail?: string;
}

/** Error state paired with a retry affordance. */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
  detail,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger-soft/40 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-danger/30 bg-surface text-danger">
        <X className="h-6 w-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      {description && <p className="mt-1.5 max-w-md text-sm text-foreground-muted">{description}</p>}

      {detail && <p className="numeric mt-2 text-2xs text-foreground-subtle">{detail}</p>}

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface-hover"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** Success confirmation state, used after a completed action. */
export function SuccessState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-success/30 bg-success-soft/40 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-success/30 bg-surface text-success">
        <Check className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-foreground-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Neutral "nothing selected" placeholder for detail panes. */
export function NoSelectionState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center',
        className
      )}
    >
      <Minus className="mb-3 h-6 w-6 text-foreground-subtle" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground-muted">{title}</p>
      {description && <p className="mt-1 text-xs text-foreground-subtle">{description}</p>}
    </div>
  );
}
