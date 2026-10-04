import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { activityApi } from '@/features/activity/api';
import { ACTIVITY_CATEGORIES, type ActivityCategory, type ActivityEntry } from '@/features/activity/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/lib/utils';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

/**
 * Audit trail screen.
 *
 * Read-only by design — the collection is append-only. Category filtering runs
 * server-side so the browser never receives rows it will not display.
 */
export default function ActivityLogPage() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t('activity.title'));

  const locale = i18n.language === 'ar' ? 'ar' : 'en';

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [category, setCategory] = useState<ActivityCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPage: number, targetCategory: ActivityCategory | 'all') => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await activityApi.list({
          page: targetPage,
          limit: PAGE_SIZE,
          category: targetCategory === 'all' ? undefined : targetCategory,
        });

        setEntries(result.items);
        setTotal(result.meta?.total ?? result.items.length);
        setPages(result.meta?.pages ?? 1);
      } catch (caught) {
        setError(getErrorMessage(caught, t('states.errorBody')));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load(page, category);
  }, [load, page, category]);

  const selectCategory = (next: ActivityCategory | 'all') => {
    setCategory(next);
    setPage(1);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('activity.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('activity.subtitle')}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(page, category)}
            disabled={isLoading}
            leadingIcon={
              isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />
            }
          >
            {t('common.retry')}
          </Button>
        </div>

        {/* ------------------------------------------------------ category filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectCategory('all')}
            className={cn(
              'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors duration-fast',
              category === 'all'
                ? 'border-primary/30 bg-primary-soft text-primary'
                : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
            )}
          >
            {t('common.all')}
          </button>

          {ACTIVITY_CATEGORIES.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => selectCategory(entry)}
              className={cn(
                'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors duration-fast',
                category === entry
                  ? 'border-primary/30 bg-primary-soft text-primary'
                  : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
              )}
            >
              {t(`activity.categories.${entry}`)}
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------------- list */}
        {error ? (
          <ErrorState
            title={t('states.errorTitle')}
            description={error}
            onRetry={() => void load(page, category)}
            retryLabel={t('common.retry')}
          />
        ) : isLoading && entries.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rf-skeleton h-16" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            size="lg"
            icon={<History className="h-6 w-6" />}
            title={t('activity.empty')}
            description={t('activity.emptyBody')}
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <ol>
              {entries.map((entry, index) => (
                <li
                  key={entry.id}
                  className={cn(
                    'flex items-start gap-3.5 px-5 py-3.5 transition-colors duration-fast hover:bg-surface-hover',
                    index < entries.length - 1 && 'border-b border-border-soft'
                  )}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-[10px] font-semibold text-foreground-muted"
                    aria-hidden="true"
                  >
                    {t(`activity.categories.${entry.category}`).slice(0, 1)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {t(entry.messageKey, {
                        ...entry.messageParams,
                        defaultValue: entry.messageKey,
                      })}
                    </p>

                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-foreground-subtle">
                      <span>{t(`activity.categories.${entry.category}`)}</span>
                      {entry.actorRole && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{t(`roles.${entry.actorRole}`, { defaultValue: entry.actorRole })}</span>
                        </>
                      )}
                      {entry.entityType && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="numeric">{entry.entityType}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <time
                    className="numeric shrink-0 pt-0.5 text-2xs text-foreground-subtle"
                    dateTime={entry.createdAt}
                  >
                    {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(entry.createdAt))}
                  </time>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {/* -------------------------------------------------------- pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <p className="numeric text-xs text-foreground-subtle">
              {t('common.showing', {
                from: (page - 1) * PAGE_SIZE + 1,
                to: Math.min(page * PAGE_SIZE, total),
                total,
              })}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((value) => Math.max(value - 1, 1))}
              >
                {t('common.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages || isLoading}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
