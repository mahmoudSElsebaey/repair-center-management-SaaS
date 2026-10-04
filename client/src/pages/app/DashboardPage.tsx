import { useTranslation } from 'react-i18next';
import {
  Activity,
  BarChart3,
  Building2,
  Info,
  RefreshCw,
  UserCog,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { StatCard } from '@/features/dashboard/components/StatCard';
import {
  ActivityTrendChart,
  BranchStrengthCard,
  RecentActivityCard,
  StaffByRoleChart,
} from '@/features/dashboard/components/DashboardCharts';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useAppSelector } from '@/store/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate } from '@/lib/utils';

/**
 * Operations dashboard.
 *
 * Everything on this screen is real data from MongoDB. Sections whose
 * collections do not exist yet are reported as such by the API and rendered with
 * an explicit explanation — never with invented figures, and never with a bare
 * "coming soon" that hides which phase brings them.
 *
 * As Phases 03 and 04 create customers, devices and repair tickets, this page
 * picks them up automatically: the API already returns those aggregates, and the
 * values switch from `null` to real counts with no change here.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));

  const user = useAppSelector((state) => state.auth.user);
  const locale = useAppSelector((state) => state.ui.locale);

  const { data, status, error, notReady, reload } = useDashboard();

  const loading = status === 'loading';

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');

  const metrics = data?.metrics;
  const sections = data?.sections;

  /* ------------------------------------------------------------------ denied */
  if (notReady) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            size="lg"
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('states.unauthorizedTitle')}
            description={t('states.unauthorizedBody')}
            action={
              <Button variant="outline" onClick={() => window.location.assign('/app/profile')}>
                {t('auth.profile.title')}
              </Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  /* ------------------------------------------------------------------- error */
  if (status === 'error') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <ErrorState
            title={t('states.errorTitle')}
            description={error ?? t('states.errorBody')}
            onRetry={reload}
            retryLabel={t('common.retry')}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ------------------------------------------------------- greeting */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="rf-overline">
              {data?.scope.isGlobal ? t('dashboard.scopeGlobal') : t('dashboard.scopeBranch')}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
              {t('dashboard.welcomeBack', { name: user?.name ?? '' })}
            </h1>
            <p className="mt-1.5 text-sm text-foreground-muted">
              {greeting} · {t(`roles.${user?.role ?? 'technician'}`)}
              {user?.lastLogin && ` · ${formatDate(user.lastLogin, locale, { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>

          <Button
            variant="outline"
            leadingIcon={<RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
            onClick={reload}
            disabled={loading}
          >
            {t('common.retry')}
          </Button>
        </div>

        {/* ----------------------------------------------------- KPI tiles */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t('dashboard.metrics.staff')}
            value={metrics?.staff ?? null}
            hint={
              metrics && metrics.staffAllBranches !== metrics.staff
                ? `${metrics.staffAllBranches} ${t('dashboard.scopeGlobal')}`
                : undefined
            }
            icon={<UserCog className="h-4 w-4" />}
            tone="primary"
            loading={loading}
          />

          <StatCard
            label={t('dashboard.metrics.branches')}
            value={metrics?.branches ?? null}
            hint={metrics ? `${metrics.activeBranches} ${t('common.yes')}` : undefined}
            icon={<Building2 className="h-4 w-4" />}
            tone="secondary"
            loading={loading}
          />

          {/* Real as of Phase 03; explicitly pending until then. */}
          <StatCard
            label={t('dashboard.metrics.customers')}
            value={sections?.customers ? (metrics?.customers ?? 0) : null}
            icon={<UserCog className="h-4 w-4" />}
            tone="success"
            loading={loading}
          />

          {/* Real as of Phase 04; explicitly pending until then. */}
          <StatCard
            label={t('dashboard.metrics.activeRepairs')}
            value={
              sections?.repairs && metrics?.repairs
                ? (metrics.repairs.in_repair ?? 0) +
                  (metrics.repairs.diagnosing ?? 0) +
                  (metrics.repairs.waiting_parts ?? 0) +
                  (metrics.repairs.approved ?? 0)
                : null
            }
            icon={<Wrench className="h-4 w-4" />}
            tone="accent"
            loading={loading}
          />
        </div>

        {/* -------------------------------------------------------- charts */}
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <ActivityTrendChart data={data?.charts.activityOverTime ?? []} loading={loading} />
          <BranchStrengthCard data={data?.charts.staffByBranch ?? []} loading={loading} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
          <StaffByRoleChart data={data?.charts.staffByRole ?? []} loading={loading} />
          <RecentActivityCard entries={data?.recentActivity ?? []} loading={loading} />
        </div>

        {/* -------------------------------------------- phase-pending panels */}
        {sections && !sections.repairs && (
          <Card>
            <CardHeader
              title={t('dashboard.sections.upcoming')}
              description={t('dashboard.sections.upcomingBody')}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-subtle">
                  <Activity className="h-3 w-3" aria-hidden="true" />
                  {t('common.comingSoon')}
                </span>
              }
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { key: 'statusDistribution', icon: BarChart3, phase: '04' },
                { key: 'technicianWorkload', icon: Wrench, phase: '04' },
                { key: 'lowStock', icon: Info, phase: '06' },
              ].map(({ key, icon: Icon, phase }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3.5 py-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground-muted">
                      {t(`dashboard.sections.${key}`)}
                    </p>
                  </div>
                  <span className="numeric shrink-0 rounded bg-surface-hover px-1.5 py-0.5 text-2xs text-foreground-subtle">
                    {phase}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
