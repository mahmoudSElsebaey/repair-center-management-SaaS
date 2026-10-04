import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/feedback/States';
import { BarChart3, Building2, HardHat } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { formatDate } from '@/lib/utils';
import { activeLocale, translate } from '@/lib/i18nText';
import type { BranchCount, DashboardActivityEntry, RoleCount } from '../types';

/**
 * Dashboard charts.
 *
 * All colours come from CSS custom properties so a chart re-themes with the
 * product, and every chart has an empty state rather than rendering an empty
 * grid when there is nothing to show.
 */

/** Shared axis styling — Recharts needs concrete values, so tokens are read at render. */
const axisProps = {
  stroke: 'var(--border-strong)',
  tick: { fill: 'var(--foreground-subtle)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

function useTooltipStyle() {
  return {
    contentStyle: {
      background: 'var(--elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontSize: 'var(--text-xs)',
      color: 'var(--foreground)',
      padding: '8px 12px',
    },
    labelStyle: { color: 'var(--foreground-muted)', marginBottom: 4 },
    itemStyle: { color: 'var(--foreground)' },
  };
}

/* -------------------------------------------------------------------------- */
/* Activity over time                                                          */
/* -------------------------------------------------------------------------- */

export function ActivityTrendChart({
  data,
  loading = false,
}: {
  data: Array<{ date: string; count: number }>;
  loading?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const tooltip = useTooltipStyle();

  const total = data.reduce((sum, point) => sum + point.count, 0);

  const series = data.map((point) => ({
    ...point,
    label: formatDate(point.date, locale, { month: 'short', day: '2-digit' }),
  }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={t('dashboard.sections.activityOverTime')}
        description={t('dashboard.sections.activityOverTimeHint')}
        action={
          <span className="numeric inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-muted">
            <BarChart3 className="h-3 w-3" aria-hidden="true" />
            {total}
          </span>
        }
      />

      {loading ? (
        <div className="rf-skeleton h-56 flex-1" />
      ) : total === 0 ? (
        <EmptyState
          className="flex-1"
          size="sm"
          icon={<BarChart3 className="h-5 w-5" />}
          title={t('dashboard.empty.activity')}
          description={t('dashboard.empty.activityBody')}
        />
      ) : (
        <div className="rf-chart h-56 w-full" role="img" aria-label={t('dashboard.sections.activityOverTime')}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
              <YAxis {...axisProps} allowDecimals={false} width={38} />
              <Tooltip {...tooltip} />

              <Area
                type="monotone"
                dataKey="count"
                name={t('dashboard.metrics.activity')}
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#activityFill)"
                activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Staff by role                                                               */
/* -------------------------------------------------------------------------- */

/** Stable tone per role so the same role is never two different colours. */
const ROLE_COLOURS: Record<string, string> = {
  super_admin: 'var(--status-in-repair)',
  admin: 'var(--primary)',
  manager: 'var(--secondary)',
  technician: 'var(--status-ready)',
  receptionist: 'var(--status-waiting-customer)',
  inventory_manager: 'var(--status-waiting-parts)',
};

export function StaffByRoleChart({
  data,
  loading = false,
}: {
  data: RoleCount[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const tooltip = useTooltipStyle();

  const populated = data.filter((row) => row.count > 0);
  const series = populated.map((row) => ({
    role: t(`roles.${row.role}`),
    roleKey: row.role,
    count: row.count,
    fill: ROLE_COLOURS[row.role] ?? 'var(--primary)',
  }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={t('dashboard.sections.staffByRole')}
        description={t('dashboard.sections.staffByRoleHint')}
      />

      {loading ? (
        <div className="rf-skeleton h-56 flex-1" />
      ) : series.length === 0 ? (
        <EmptyState
          className="flex-1"
          size="sm"
          icon={<HardHat className="h-5 w-5" />}
          title={t('dashboard.empty.workload')}
        />
      ) : (
        <div className="rf-chart h-56 w-full" role="img" aria-label={t('dashboard.sections.staffByRole')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 0 }}>
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="role"
                {...axisProps}
                width={110}
                tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }}
              />
              <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-hover)' }} />

              <Bar dataKey="count" name={t('dashboard.metrics.staff')} radius={[0, 4, 4, 0]} barSize={16}>
                {series.map((entry) => (
                  <Cell key={entry.roleKey} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Staff by branch                                                             */
/* -------------------------------------------------------------------------- */

export function BranchStrengthCard({
  data,
  loading = false,
}: {
  data: BranchCount[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const tooltip = useTooltipStyle();

  const total = data.reduce((sum, row) => sum + row.count, 0);

  const series = data.map((row) => ({
    name: row.name ?? t('dashboard.unassigned'),
    code: row.code,
    count: row.count,
    fill: row.branchId === null ? 'var(--accent)' : 'var(--secondary)',
  }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={t('dashboard.sections.branchStrength')}
        description={t('dashboard.sections.branchStrengthHint')}
        action={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-muted">
            <Building2 className="h-3 w-3" aria-hidden="true" />
            {series.length}
          </span>
        }
      />

      {loading ? (
        <div className="rf-skeleton h-44 flex-1" />
      ) : total === 0 ? (
        <EmptyState
          className="flex-1"
          size="sm"
          icon={<Building2 className="h-5 w-5" />}
          title={t('dashboard.empty.branches')}
        />
      ) : (
        <>
          <div className="rf-chart h-40 w-full" role="img" aria-label={t('dashboard.sections.branchStrength')}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={series}
                innerRadius="32%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, Math.max(total, 1)]} tick={false} />
                <Tooltip {...tooltip} />
                <RadialBar dataKey="count" background={{ fill: 'var(--surface-hover)' }} cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {series.map((row) => (
              <li key={row.name} className="flex items-center gap-2.5 text-sm">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.fill }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-foreground-muted">{row.name}</span>
                {row.code && (
                  <span className="numeric shrink-0 text-2xs text-foreground-subtle">{row.code}</span>
                )}
                <span className="numeric shrink-0 font-medium text-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent activity                                                             */
/* -------------------------------------------------------------------------- */

const CATEGORY_TONE: Record<string, string> = {
  auth: 'bg-info-soft text-info',
  staff: 'bg-primary-soft text-primary',
  customer: 'bg-secondary-soft text-secondary',
  device: 'bg-secondary-soft text-secondary',
  repair: 'bg-success-soft text-success',
  inventory: 'bg-accent-soft text-accent',
  finance: 'bg-success-soft text-success',
  appointment: 'bg-primary-soft text-primary',
};

export function RecentActivityCard({
  entries,
  loading = false,
}: {
  entries: DashboardActivityEntry[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const locale = useAppSelector((state) => state.ui.locale);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title={t('dashboard.sections.recentActivity')}
        description={t('activity.subtitle')}
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rf-skeleton h-12" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          className="flex-1"
          size="sm"
          title={t('dashboard.empty.activity')}
          description={t('dashboard.empty.activityBody')}
        />
      ) : (
        <ol className="relative flex-1 space-y-0">
          {entries.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < entries.length - 1 && (
                <span
                  className="absolute top-7 h-full w-px bg-border start-[0.6875rem]"
                  aria-hidden="true"
                />
              )}

              <span
                className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  CATEGORY_TONE[entry.category] ?? 'bg-surface-hover text-foreground-muted'
                }`}
                aria-hidden="true"
              >
                {t(`activity.categories.${entry.category}`).slice(0, 1)}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm text-foreground">
                  {translate(entry.messageKey, entry.messageParams)}
                </p>
                <p className="mt-0.5 text-2xs text-foreground-subtle">
                  {formatDate(
                    entry.createdAt,
                    activeLocale() === locale ? locale : activeLocale(),
                    {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                  {entry.entityLabel && ` · ${entry.entityLabel}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
