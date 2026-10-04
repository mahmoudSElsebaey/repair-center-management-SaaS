import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardHat, Wrench } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { PageTransition } from '@/components/motion/primitives';
import { staffApi } from '@/features/staff/api';
import type { StaffMember } from '@/features/staff/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getErrorMessage } from '@/lib/utils';

export default function TechniciansPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('technicians.title'));

  const [items, setItems] = useState<StaffMember[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await staffApi.workload();
      setItems(data);
      setStatus('ready');
    } catch (caught) {
      setError(getErrorMessage(caught, t('states.errorBody')));
      setStatus('error');
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-7xl">
          <PageSkeleton rows={3} />
        </div>
      </PageTransition>
    );
  }

  if (status === 'error') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <ErrorState title={t('states.errorTitle')} description={error ?? ''} onRetry={load} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('technicians.title')}</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">{t('technicians.subtitle')}</p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<HardHat className="h-6 w-6" />}
            title={t('technicians.empty')}
            description={t('technicians.emptyBody')}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tech) => (
              <Card key={tech.id}>
                <CardHeader
                  title={tech.name}
                  action={
                    <Badge tone="primary" size="sm">
                      {t(`roles.${tech.role}`)}
                    </Badge>
                  }
                />
                <div className="space-y-3 px-2 pb-2">
                  <p className="text-xs text-foreground-subtle">
                    {tech.branch?.name ?? t('staff.fields.branchNone')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface-sunken px-2 py-3">
                      <p className="numeric text-lg font-semibold text-foreground">
                        {tech.workload?.openTickets ?? 0}
                      </p>
                      <p className="mt-0.5 text-2xs text-foreground-subtle">{t('technicians.open')}</p>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-2 py-3">
                      <p className="numeric text-lg font-semibold text-primary">
                        {tech.workload?.activeTickets ?? 0}
                      </p>
                      <p className="mt-0.5 text-2xs text-foreground-subtle">
                        {t('technicians.active')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-2 py-3">
                      <p className="numeric text-lg font-semibold text-success">
                        {tech.workload?.completedLast30Days ?? 0}
                      </p>
                      <p className="mt-0.5 text-2xs text-foreground-subtle">
                        {t('technicians.done30')}
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-foreground-subtle">
                    <Wrench className="h-3 w-3" aria-hidden="true" />
                    {t('technicians.onBench')}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
