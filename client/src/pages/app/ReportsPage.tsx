import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { BarChart3, CreditCard, FileText, RefreshCw, TrendingUp, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { reportsApi } from '@/features/reports/api';
import type { AnalyticsData, DatePreset } from '@/features/reports/types';
import { useAppSelector } from '@/store/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatCurrency, formatDate, formatNumber, getErrorMessage, cn } from '@/lib/utils';

const axisProps = {
  stroke: 'var(--border-strong)',
  tick: { fill: 'var(--foreground-subtle)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const METHOD_COLOURS: Record<string, string> = {
  cash: 'var(--status-ready)', card: 'var(--primary)', transfer: 'var(--secondary)', wallet: 'var(--accent)',
};

const STATUS_COLOURS: Record<string, string> = {
  draft: 'var(--foreground-subtle)', issued: 'var(--info)', partially_paid: 'var(--status-waiting-customer)',
  paid: 'var(--status-ready)', void: 'var(--danger)', received: 'var(--info)', diagnosing: 'var(--status-diagnosing)',
  waiting_parts: 'var(--status-waiting-parts)', waiting_customer: 'var(--status-waiting-customer)',
  approved: 'var(--secondary)', in_repair: 'var(--status-in-repair)', ready: 'var(--status-ready)',
  delivered: 'var(--success)', cancelled: 'var(--danger)',
};

function useTooltipStyle() {
  return {
    contentStyle: {
      background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', fontSize: 'var(--text-xs)', color: 'var(--foreground)', padding: '8px 12px',
    },
    labelStyle: { color: 'var(--foreground-muted)', marginBottom: 4 },
    itemStyle: { color: 'var(--foreground)' },
  };
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: DatePreset): { from: string; to: string } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  if (preset === '7d') from.setDate(from.getDate() - 6);
  else if (preset === '90d') from.setDate(from.getDate() - 89);
  else from.setDate(from.getDate() - 29);
  from.setHours(0, 0, 0, 0);
  return { from: toInputDate(from), to: toInputDate(to) };
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t('reports.title'));
  const locale = useAppSelector((state) => state.ui.locale);
  const lang = i18n.language === 'ar' ? 'ar' : 'en';
  const tooltip = useTooltipStyle();

  const [preset, setPreset] = useState<DatePreset>('30d');
  const [from, setFrom] = useState(() => presetRange('30d').from);
  const [to, setTo] = useState(() => presetRange('30d').to);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const result = await reportsApi.analytics({ from, to });
      setData(result);
      setStatus('ready');
    } catch (err) {
      setError(getErrorMessage(err, t('states.errorBody')));
      setStatus('error');
    }
  }, [from, to, t]);

  useEffect(() => { void load(); }, [load]);

  const applyPreset = (next: DatePreset) => {
    setPreset(next);
    if (next !== 'custom') {
      const range = presetRange(next);
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const revenueSeries = useMemo(
    () => (data?.charts.revenueOverTime ?? []).map((p) => ({
      ...p, label: formatDate(p.date, lang, { month: 'short', day: '2-digit' }),
    })),
    [data, lang]
  );
  const repairsSeries = useMemo(
    () => (data?.charts.repairsCreatedOverTime ?? []).map((p) => ({
      ...p, label: formatDate(p.date, lang, { month: 'short', day: '2-digit' }),
    })),
    [data, lang]
  );
  const methodSeries = useMemo(
    () => (data?.charts.paymentsByMethod ?? []).filter((r) => r.amount > 0 || r.count > 0).map((r) => ({
      ...r, name: t(`invoices.methods.${r.method}`, { defaultValue: r.method }),
      fill: METHOD_COLOURS[r.method] ?? 'var(--primary)',
    })),
    [data, t]
  );
  const invoiceStatusSeries = useMemo(
    () => (data?.charts.invoicesByStatus ?? []).filter((r) => r.count > 0).map((r) => ({
      ...r, name: t(`invoices.status.${r.status}`, { defaultValue: r.status }),
      fill: STATUS_COLOURS[r.status] ?? 'var(--primary)',
    })),
    [data, t]
  );
  const repairStatusSeries = useMemo(
    () => (data?.charts.repairsByStatus ?? []).filter((r) => r.count > 0).map((r) => ({
      ...r, name: t(`repairs.status.${r.status}`, { defaultValue: r.status }),
      fill: STATUS_COLOURS[r.status] ?? 'var(--primary)',
    })),
    [data, t]
  );
  const techSeries = useMemo(() => data?.charts.technicianPerformance ?? [], [data]);

  const loading = status === 'loading';
  const kpis = data?.kpis;

  if (status === 'error') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <ErrorState title={t('states.errorTitle')} description={error ?? t('states.errorBody')} onRetry={load} retryLabel={t('common.retry')} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="rf-overline">{data?.scope.isGlobal ? t('reports.scopeGlobal') : t('reports.scopeBranch')}</p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">{t('reports.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('reports.subtitle')}</p>
          </div>
          <Button variant="outline" leadingIcon={<RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />} onClick={load} disabled={loading}>
            {t('common.retry')}
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap gap-2">
              {(['7d', '30d', '90d', 'custom'] as DatePreset[]).map((key) => (
                <button key={key} type="button" onClick={() => applyPreset(key)} className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  preset === key ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground'
                )}>{t(`reports.presets.${key}`)}</button>
              ))}
            </div>
            <div className="ms-auto flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-2xs text-foreground-subtle">{t('reports.from')}
                <input type="date" value={from} onChange={(e) => { setPreset('custom'); setFrom(e.target.value); }} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground" />
              </label>
              <label className="flex flex-col gap-1 text-2xs text-foreground-subtle">{t('reports.to')}
                <input type="date" value={to} onChange={(e) => { setPreset('custom'); setTo(e.target.value); }} className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-foreground" />
              </label>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('reports.kpis.revenue')} value={data?.sections.payments ? formatCurrency(kpis?.revenueTotal ?? 0, 'EGP', locale) : null} hint={data?.sections.payments ? t('reports.kpis.paymentCount', { count: kpis?.paymentCount ?? 0 }) : undefined} icon={<TrendingUp className="h-4 w-4" />} tone="success" loading={loading} />
          <StatCard label={t('reports.kpis.invoiced')} value={data?.sections.invoices && kpis?.totalInvoiced != null ? formatCurrency(kpis.totalInvoiced, 'EGP', locale) : null} hint={data?.sections.invoices && kpis?.totalOutstanding != null ? t('reports.kpis.outstanding', { amount: formatCurrency(kpis.totalOutstanding, 'EGP', locale) }) : undefined} icon={<FileText className="h-4 w-4" />} tone="primary" loading={loading} />
          <StatCard label={t('reports.kpis.repairsCreated')} value={data?.sections.repairs && kpis?.repairsCreated != null ? formatNumber(kpis.repairsCreated, locale) : null} hint={data?.sections.repairs && kpis?.repairsCompleted != null ? t('reports.kpis.completedHint', { count: kpis.repairsCompleted }) : undefined} icon={<Wrench className="h-4 w-4" />} tone="accent" loading={loading} />
          <StatCard label={t('reports.kpis.activeRepairs')} value={data?.sections.repairs && kpis?.repairsActive != null ? formatNumber(kpis.repairsActive, locale) : null} hint={data?.sections.repairs && kpis?.repairsCancelled != null ? t('reports.kpis.cancelledHint', { count: kpis.repairsCancelled }) : undefined} icon={<BarChart3 className="h-4 w-4" />} tone="secondary" loading={loading} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.revenueOverTime')} description={t('reports.charts.revenueOverTimeHint')} />
            {loading ? <div className="rf-skeleton h-56 flex-1" /> : !data?.sections.payments || revenueSeries.every((p) => p.value === 0) ? (
              <EmptyState className="flex-1" size="sm" icon={<TrendingUp className="h-5 w-5" />} title={t('reports.empty.revenue')} description={t('reports.empty.revenueBody')} />
            ) : (
              <div className="rf-chart h-56 w-full" role="img" aria-label={t('reports.charts.revenueOverTime')}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                    <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} /></linearGradient></defs>
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis {...axisProps} width={48} />
                    <Tooltip {...tooltip} formatter={(value: number) => [formatCurrency(value, 'EGP', locale), t('reports.kpis.revenue')]} />
                    <Area type="monotone" dataKey="value" name={t('reports.kpis.revenue')} stroke="var(--success)" strokeWidth={2} fill="url(#revenueFill)" activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--success)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.paymentsByMethod')} description={t('reports.charts.paymentsByMethodHint')} />
            {loading ? <div className="rf-skeleton h-56 flex-1" /> : methodSeries.length === 0 ? (
              <EmptyState className="flex-1" size="sm" icon={<CreditCard className="h-5 w-5" />} title={t('reports.empty.payments')} />
            ) : (
              <>
                <div className="rf-chart h-40 w-full" role="img" aria-label={t('reports.charts.paymentsByMethod')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={methodSeries} dataKey="amount" nameKey="name" innerRadius="48%" outerRadius="80%" paddingAngle={2}>
                        {methodSeries.map((entry) => <Cell key={entry.method} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip {...tooltip} formatter={(value: number) => formatCurrency(value, 'EGP', locale)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5 border-t border-border pt-3">
                  {methodSeries.map((row) => (
                    <li key={row.method} className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.fill }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-foreground-muted">{row.name}</span>
                      <span className="numeric shrink-0 text-2xs text-foreground-subtle">{row.count}</span>
                      <span className="numeric shrink-0 font-medium text-foreground">{formatCurrency(row.amount, 'EGP', locale)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.invoicesByStatus')} description={t('reports.charts.invoicesByStatusHint')} />
            {loading ? <div className="rf-skeleton h-52 flex-1" /> : invoiceStatusSeries.length === 0 ? (
              <EmptyState className="flex-1" size="sm" icon={<FileText className="h-5 w-5" />} title={t('reports.empty.invoices')} />
            ) : (
              <div className="rf-chart h-52 w-full" role="img" aria-label={t('reports.charts.invoicesByStatus')}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoiceStatusSeries} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" {...axisProps} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={100} tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} />
                    <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-hover)' }} />
                    <Bar dataKey="count" name={t('reports.count')} radius={[0, 4, 4, 0]} barSize={14}>
                      {invoiceStatusSeries.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.repairsByStatus')} description={t('reports.charts.repairsByStatusHint')} />
            {loading ? <div className="rf-skeleton h-52 flex-1" /> : repairStatusSeries.length === 0 ? (
              <EmptyState className="flex-1" size="sm" icon={<Wrench className="h-5 w-5" />} title={t('reports.empty.repairs')} />
            ) : (
              <div className="rf-chart h-52 w-full" role="img" aria-label={t('reports.charts.repairsByStatus')}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repairStatusSeries} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <XAxis type="number" {...axisProps} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={110} tick={{ fill: 'var(--foreground-muted)', fontSize: 11 }} />
                    <Tooltip {...tooltip} cursor={{ fill: 'var(--surface-hover)' }} />
                    <Bar dataKey="count" name={t('reports.count')} radius={[0, 4, 4, 0]} barSize={14}>
                      {repairStatusSeries.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.repairsCreated')} description={t('reports.charts.repairsCreatedHint')} />
            {loading ? <div className="rf-skeleton h-52 flex-1" /> : !data?.sections.repairs || repairsSeries.every((p) => p.value === 0) ? (
              <EmptyState className="flex-1" size="sm" icon={<Wrench className="h-5 w-5" />} title={t('reports.empty.repairs')} />
            ) : (
              <div className="rf-chart h-52 w-full" role="img" aria-label={t('reports.charts.repairsCreated')}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={repairsSeries} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                    <defs><linearGradient id="repairsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} /></linearGradient></defs>
                    <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={18} />
                    <YAxis {...axisProps} allowDecimals={false} width={36} />
                    <Tooltip {...tooltip} />
                    <Area type="monotone" dataKey="value" name={t('reports.kpis.repairsCreated')} stroke="var(--primary)" strokeWidth={2} fill="url(#repairsFill)" activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--primary)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="flex h-full flex-col">
            <CardHeader title={t('reports.charts.technicianPerformance')} description={t('reports.charts.technicianPerformanceHint')} />
            {loading ? <div className="rf-skeleton h-52 flex-1" /> : techSeries.length === 0 ? (
              <EmptyState className="flex-1" size="sm" icon={<Wrench className="h-5 w-5" />} title={t('reports.empty.technicians')} />
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {techSeries.map((row) => (
                  <li key={row.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                      <p className="mt-0.5 text-2xs text-foreground-subtle">{t('reports.tech.active', { count: row.active })} · {t('reports.tech.cancelled', { count: row.cancelled })}</p>
                    </div>
                    <span className="numeric shrink-0 rounded-md bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">{row.completed}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
