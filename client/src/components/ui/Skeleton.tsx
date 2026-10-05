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

/**
 * Table loading placeholder used by DataTable while the first page loads.
 */
export function TableSkeleton({
  columns = 5,
  rows = 6,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('rf-panel overflow-hidden', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading table"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-start">
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row} className="border-b border-border-soft last:border-b-0">
                {Array.from({ length: columns }).map((_, col) => (
                  <td key={col} className="px-4 py-3">
                    <Skeleton
                      className={cn(
                        'h-4',
                        col === 0 ? 'w-28' : col === columns - 1 ? 'w-16' : 'w-24'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Full-page loading skeleton (also re-exported for pages that import from ui/Skeleton).
 * `rows` controls how many content placeholders are shown.
 */
export function PageSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('mx-auto max-w-6xl space-y-6 p-4 sm:p-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {rows > 3 && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      )}
    </div>
  );
}
