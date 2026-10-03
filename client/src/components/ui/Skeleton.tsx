import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'title' | 'block' | 'circle';
}

const VARIANTS = {
  text: 'h-3.5 rounded',
  title: 'h-6 rounded-md',
  block: 'h-24 rounded-lg',
  circle: 'rounded-full',
} as const;

/** Shimmer placeholder. Respects reduced motion via the token layer. */
export function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  return <div className={cn('rf-skeleton', VARIANTS[variant], className)} aria-hidden="true" {...props} />;
}

/** Composed skeleton for a page of content, so loading never looks broken. */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="rf-sr-only">Loading</span>

      <div className="space-y-2">
        <Skeleton variant="title" className="w-64" />
        <Skeleton className="w-96 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="block" className="h-24" />
        ))}
      </div>

      <div className="rf-panel p-5">
        <Skeleton variant="title" className="mb-4 w-40" />
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className={index % 2 === 0 ? 'w-full' : 'w-5/6'} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Table-shaped skeleton, sized to the real table's column count. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rf-panel overflow-hidden" role="status" aria-live="polite">
      <span className="rf-sr-only">Loading</span>
      <div className="flex items-center gap-4 border-b border-border bg-surface-sunken px-5 py-3.5">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-4 border-b border-border-soft px-5 py-4 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
