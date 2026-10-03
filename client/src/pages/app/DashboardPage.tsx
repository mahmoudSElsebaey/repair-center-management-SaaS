import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  Clock,
  Info,
  PackageSearch,
  Plus,
  UserPlus,
  Wallet,
  Wrench,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { useAppSelector } from '@/store/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDate } from '@/lib/utils';

/**
 * Operations dashboard.
 *
 * Phase 01 ships the shell with a real greeting and real account context from
 * the API. The metric tiles are present but explicitly marked as pending rather
 * than filled with invented numbers — a dashboard that lies about its data is
 * worse than one that says "not yet".
 *
 * Phase 02 replaces the placeholder panel with live aggregates and charts.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('dashboard.title'));

  const user = useAppSelector((state) => state.auth.user);
  const locale = useAppSelector((state) => state.ui.locale);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('dashboard.greetingMorning')
      : hour < 17
        ? t('dashboard.greetingAfternoon')
        : t('dashboard.greetingEvening');

  /** Metrics arrive with Phase 02's `/reports/dashboard` endpoint. */
  const metricKeys = [
    { key: 'activeRepairs', icon: Wrench },
    { key: 'awaitingApproval', icon: Clock },
    { key: 'readyPickup', icon: PackageSearch },
    { key: 'revenue', icon: Wallet },
  ] as const;

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ---------- Greeting ---------- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="rf-overline">{t('dashboard.today')}</p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
              {t('dashboard.welcomeBack', { name: user?.name ?? '' })}
            </h1>
            <p className="mt-1.5 text-sm text-foreground-muted">
              {greeting} · {t(`roles.${user?.role ?? 'technician'}`)}
              {user?.lastLogin && ` · ${t('auth.profile.lastLogin')}: ${formatDate(user.lastLogin, locale)}`}
            </p>
          </div>

          <Button
            leadingIcon={<Plus className="h-4 w-4" />}
            title={t('common.comingSoon')}
            disabled
          >
            {t('dashboard.quickActions.newRepair')}
          </Button>
        </div>

        {/* ---------- Phase notice ---------- */}
        <div className="flex items-start gap-3 rounded-xl border border-info/25 bg-info-soft px-4 py-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{t('dashboard.shellNotice')}</p>
            <p className="mt-0.5 text-xs text-foreground-muted">
              {t('dashboard.subtitle')}
            </p>
          </div>
        </div>

        {/* ---------- Metric tiles ---------- */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricKeys.map(({ key, icon: Icon }) => (
            <Card key={key} variant="interactive" className="relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground-subtle">
                    {t(`dashboard.metrics.${key}`)}
                  </p>
                  <p className="numeric mt-2.5 text-2xl font-bold text-foreground-subtle">—</p>
                </div>

                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-foreground-subtle"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <p className="mt-3 text-2xs text-foreground-subtle">{t('common.comingSoon')}</p>
            </Card>
          ))}
        </div>

        {/* ---------- Two-column workspace ---------- */}
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* Charts placeholder — replaced with Recharts in Phase 11 */}
          <Card className="flex min-h-[22rem] flex-col">
            <CardHeader
              title={t('dashboard.sections.repairsOverTime')}
              description={t('landing.analytics.subtitle')}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-subtle">
                  <BarChart3 className="h-3 w-3" aria-hidden="true" />
                  {t('common.comingSoon')}
                </span>
              }
            />

            <EmptyState
              className="flex-1"
              size="lg"
              icon={<BarChart3 className="h-6 w-6" />}
              title={t('states.emptyTitle')}
              description={t('dashboard.shellNotice')}
            />
          </Card>

          <div className="space-y-5">
            {/* Quick actions */}
            <Card>
              <CardHeader title={t('dashboard.quickActions.title')} />

              <ul className="space-y-1.5">
                {[
                  { key: 'newRepair', icon: Wrench },
                  { key: 'newCustomer', icon: UserPlus },
                  { key: 'newDevice', icon: PackageSearch },
                  { key: 'recordPayment', icon: Wallet },
                ].map(({ key, icon: Icon }) => (
                  <li key={key}>
                    <button
                      type="button"
                      disabled
                      title={t('common.comingSoon')}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-start transition-colors duration-fast hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0 text-foreground-subtle"
                        aria-hidden="true"
                      />
                      <span className="flex-1 text-sm text-foreground-muted">
                        {t(`dashboard.quickActions.${key}`)}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-foreground-subtle rf-flip-rtl"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Recent activity */}
            <Card>
              <CardHeader
                title={t('dashboard.sections.recentActivity')}
                action={
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-subtle">
                    <CalendarPlus className="h-3 w-3" aria-hidden="true" />
                    {t('common.comingSoon')}
                  </span>
                }
              />

              <EmptyState
                size="sm"
                title={t('dashboard.empty.activity')}
                description={t('dashboard.empty.activityBody')}
              />
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
