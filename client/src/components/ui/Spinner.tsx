import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

/** Indeterminate progress indicator. Announce with `label` when it blocks work. */
export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent text-primary',
        SIZES[size],
        className
      )}
    >
      <span className="rf-sr-only">{label ?? 'Loading'}</span>
    </span>
  );
}

/** Full-block loader used while a route or panel's data is in flight. */
export function LoadingBlock({
  label,
  description,
  className,
  minHeight = 'min-h-[45vh]',
}: {
  label: string;
  description?: string;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        minHeight,
        className
      )}
    >
      <Spinner size="lg" label={label} />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-1 text-xs text-foreground-subtle">{description}</p>}
      </div>
    </div>
  );
}

/** Inline loader for buttons-in-tables and small async regions. */
export function InlineLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-foreground-muted', className)}>
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}
