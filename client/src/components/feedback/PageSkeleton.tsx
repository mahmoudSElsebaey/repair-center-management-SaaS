import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useTranslation } from 'react-i18next';

/**
 * Full-page loading skeleton used as Suspense fallback for lazy routes.
 * Matches the typical app page layout (title + filters + content cards).
 */
export function PageSkeleton() {
  const { t } = useTranslation();

  return (
    <div
      className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6"
      role="status"
      aria-label={t('a11y.loadingPage')}
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
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard className="hidden lg:block" />
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
    </div>
  );
}
