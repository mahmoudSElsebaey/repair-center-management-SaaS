import { cn } from '@/lib/utils';

type SkeletonProps = {
  className?: string;
  /** Optional accessible label announced while content loads */
  label?: string;
};

/**
 * Neutral loading placeholder. Prefer consistent skeleton shapes over spinners
 * for list and dashboard surfaces so layout does not jump.
 */
export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/70 dark:bg-muted/40',
        'motion-reduce:animate-none motion-reduce:opacity-70',
        className
      )}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        className
      )}
      aria-hidden
    >
      <Skeleton className="mb-3 h-4 w-1/3" />
      <SkeletonText lines={2} />
      <Skeleton className="mt-4 h-8 w-24" />
    </div>
  );
}
