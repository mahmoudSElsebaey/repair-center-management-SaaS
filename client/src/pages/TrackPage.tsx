import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Logo } from '@/components/ui/Logo';
import { StatusBadge, TicketCode } from '@/features/repairs/components/TicketBadges';
import { HAPPY_PATH, happyPathIndex, STATUS_STYLES } from '@/features/repairs/workflow';
import { trackApi } from '@/features/track/api';
import type { PublicTrackData } from '@/features/track/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { ApiError } from '@/lib/apiClient';
import { cn, formatDate, getErrorMessage } from '@/lib/utils';
import type { RepairStatus } from '@/types/domain';

type LoadState = 'idle' | 'loading' | 'ready' | 'not_found' | 'error';

export default function TrackPage() {
  const { t } = useTranslation();
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const locale = activeLocale();

  const [lookup, setLookup] = useState(routeCode ?? '');
  const [data, setData] = useState<PublicTrackData | null>(null);
  const [state, setState] = useState<LoadState>(routeCode ? 'loading' : 'idle');
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(
    data ? t('track.documentTitle', { code: data.code }) : t('track.title')
  );

  const load = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) {
        setState('idle');
        setData(null);
        return;
      }

      setState('loading');
      setError(null);
      try {
        const result = await trackApi.get(code);
        setData(result);
        setState('ready');
      } catch (caught) {
        setData(null);
        if (caught instanceof ApiError && (caught.status === 404 || caught.code === 'TRACK_NOT_FOUND')) {
          setState('not_found');
          return;
        }
        setError(getErrorMessage(caught, t('states.errorBody')));
        setState('error');
      }
    },
    [t]
  );

  useEffect(() => {
    if (routeCode) {
      setLookup(routeCode);
      void load(routeCode);
    } else {
      setState('idle');
      setData(null);
    }
  }, [routeCode, load]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = lookup.trim().toUpperCase();
    if (!next) return;
    if (next === routeCode?.toUpperCase()) {
      void load(next);
      return;
    }
    navigate(`/track/${encodeURIComponent(next)}`);
  };

  const currentIndex = data ? happyPathIndex(data.status) : -1;

  const deviceLabel = useMemo(() => {
    if (!data?.device) return null;
    const parts = [data.device.brand, data.device.modelName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : null;
  }, [data]);

  return (
    <PageTransition>
      <div className="rf-container py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo variant="mark" size="lg" className="mb-4" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('track.title')}
            </h1>
            <p className="mt-2 max-w-md text-sm text-foreground-muted">{t('track.subtitle')}</p>
          </div>

          <form onSubmit={onSubmit} className="mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label={t('track.lookupLabel')}
                  placeholder={t('track.lookupPlaceholder')}
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  dir="ltr"
                  autoComplete="off"
                  className="numeric"
                />
              </div>
              <Button
                type="submit"
                leadingIcon={<Search className="h-4 w-4" />}
                isLoading={state === 'loading'}
                className="sm:mb-0.5"
              >
                {t('track.lookupAction')}
              </Button>
            </div>
          </form>

          {state === 'loading' && <PageSkeleton rows={3} />}

          {state === 'idle' && (
            <EmptyState
              size="md"
              icon={<QrCode className="h-6 w-6" />}
              title={t('track.idleTitle')}
              description={t('track.idleBody')}
            />
          )}

          {state === 'not_found' && (
            <EmptyState
              size="md"
              icon={<Search className="h-6 w-6" />}
              title={t('track.notFound')}
              description={t('track.notFoundBody')}
            />
          )}

          {state === 'error' && (
            <ErrorState
              title={t('states.errorTitle')}
              description={error ?? t('states.errorBody')}
              onRetry={() => routeCode && void load(routeCode)}
              retryLabel={t('common.retry')}
            />
          )}

          {state === 'ready' && data && (
            <div className="space-y-5">
              <Card className="overflow-hidden">
                <div className="border-b border-border bg-surface/50 px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-2xs font-medium uppercase tracking-wide text-foreground-subtle">
                        {t('track.ticketCode')}
                      </p>
                      <h2 className="mt-0.5 text-xl font-bold">
                        <TicketCode code={data.code} />
                      </h2>
                    </div>
                    <StatusBadge status={data.status} />
                  </div>
                  {data.isOpen ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary">
                      <span className="rf-live-dot" aria-hidden="true" />
                      {t('track.openTicket')}
                    </p>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-foreground-subtle">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('track.closedTicket')}
                    </p>
                  )}
                </div>

                <div className="space-y-4 px-5 py-5">
                  {data.issue && (
                    <div>
                      <p className="text-2xs font-medium uppercase tracking-wide text-foreground-subtle">
                        {t('track.issue')}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{data.issue}</p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {deviceLabel && (
                      <InfoRow
                        icon={<Smartphone className="h-4 w-4" />}
                        label={t('track.device')}
                        value={deviceLabel}
                      />
                    )}
                    {data.customer?.name && (
                      <InfoRow
                        icon={<UserRound className="h-4 w-4" />}
                        label={t('track.customer')}
                        value={data.customer.name}
                      />
                    )}
                    {data.branch?.name && (
                      <InfoRow
                        icon={<Building2 className="h-4 w-4" />}
                        label={t('track.branch')}
                        value={[data.branch.name, data.branch.city].filter(Boolean).join(' · ')}
                      />
                    )}
                    {data.branch?.phone && (
                      <InfoRow
                        icon={<Phone className="h-4 w-4" />}
                        label={t('track.branchPhone')}
                        value={data.branch.phone}
                        ltr
                      />
                    )}
                    {data.expectedCompletionAt && (
                      <InfoRow
                        icon={<CalendarClock className="h-4 w-4" />}
                        label={t('track.expected')}
                        value={formatDate(data.expectedCompletionAt, locale)}
                      />
                    )}
                    {data.warrantyDays != null && data.warrantyDays > 0 && (
                      <InfoRow
                        icon={<ShieldCheck className="h-4 w-4" />}
                        label={t('track.warranty')}
                        value={t('track.warrantyDays', { days: data.warrantyDays })}
                      />
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title={t('track.timeline')} />
                <ol className="space-y-0 px-2 pb-1">
                  {HAPPY_PATH.map((status, index) => {
                    const isDone =
                      data.status === 'cancelled'
                        ? false
                        : currentIndex > index || (currentIndex === index && !data.isOpen && status === data.status);
                    const isCurrent =
                      data.status !== 'cancelled' &&
                      currentIndex === index &&
                      (data.isOpen || status === data.status);

                    return (
                      <li key={status} className="relative flex gap-3.5 pb-5 last:pb-0">
                        {index < HAPPY_PATH.length - 1 && (
                          <span
                            className={cn(
                              'absolute top-6 h-full w-px start-[0.5625rem]',
                              isDone ? 'bg-success/40' : 'bg-border'
                            )}
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={cn(
                            'relative z-10 mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border-2',
                            isDone && 'border-success bg-success',
                            isCurrent && 'border-primary bg-primary-soft',
                            !isDone && !isCurrent && 'border-border bg-surface'
                          )}
                          aria-hidden="true"
                        >
                          {isDone && <CheckCircle2 className="h-2.5 w-2.5 text-success-foreground" />}
                          {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p
                            className={cn(
                              'text-sm',
                              isDone || isCurrent
                                ? 'font-medium text-foreground'
                                : 'text-foreground-subtle'
                            )}
                          >
                            {t(`repairs.status.${status}`)}
                          </p>
                          {isCurrent && (
                            <p className="mt-0.5 text-2xs text-primary">{t('track.currentStep')}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {data.status === 'cancelled' && (
                    <li className="relative flex gap-3.5">
                      <span
                        className={cn(
                          'relative z-10 mt-0.5 flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border-2',
                          STATUS_STYLES.cancelled.ring,
                          'bg-danger-soft'
                        )}
                        aria-hidden="true"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                      </span>
                      <p className="pt-0.5 text-sm font-medium text-danger">
                        {t('repairs.status.cancelled')}
                      </p>
                    </li>
                  )}
                </ol>
              </Card>

              {data.statusHistory.length > 0 && (
                <Card>
                  <CardHeader title={t('track.history')} />
                  <ul className="space-y-3 px-2 pb-1">
                    {[...data.statusHistory].reverse().map((entry, i) => (
                      <li
                        key={`${entry.to}-${entry.at}-${i}`}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {t(`repairs.status.${entry.to as RepairStatus}`)}
                        </span>
                        <span className="numeric shrink-0 text-xs text-foreground-subtle">
                          {formatDate(entry.at, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <p className="text-center text-2xs text-foreground-subtle">
                {t('track.privacyNote')}
              </p>
            </div>
          )}

          <p className="mt-10 text-center text-xs text-foreground-subtle">
            <Link to="/" className="text-primary hover:underline">
              {t('track.backHome')}
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

function InfoRow({
  icon,
  label,
  value,
  ltr,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-border-soft bg-surface/40 px-3 py-2.5">
      <span className="mt-0.5 text-foreground-subtle" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xs text-foreground-subtle">{label}</p>
        <p className={cn('mt-0.5 text-sm font-medium text-foreground', ltr && 'numeric')} dir={ltr ? 'ltr' : undefined}>
          {value}
        </p>
      </div>
    </div>
  );
}
