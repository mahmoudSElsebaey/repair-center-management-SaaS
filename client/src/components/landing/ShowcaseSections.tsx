import { useTranslation } from 'react-i18next';
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  CalendarCheck,
  ClipboardList,
  FileText,
  HardHat,
  PackageCheck,
  QrCode,
  ScanSearch,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { cn } from '@/lib/utils';

/* ========================================================================== */
/* 1. How it works — six connected stages                                      */
/* ========================================================================== */

const STEP_ICONS = [ClipboardList, Stethoscope, BadgeCheck, HardHat, FileText, QrCode] as const;

export function HowItWorksSection() {
  const { t } = useTranslation();

  const stepKeys = ['intake', 'diagnose', 'quote', 'repair', 'invoice', 'track'] as const;

  return (
    <Section id="how">
      <Reveal>
        <SectionHeading
          overline={t('landing.how.overline')}
          title={t('landing.how.title')}
          subtitle={t('landing.how.subtitle')}
        />
      </Reveal>

      <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stepKeys.map((key, index) => {
          const Icon = STEP_ICONS[index];

          return (
            <RevealItem key={key}>
              <article className="group relative h-full overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm transition-all duration-normal ease-soft hover:-translate-y-1 hover:border-border-strong hover:shadow-md">
                {/* Stage index */}
                <span
                  className="numeric absolute end-5 top-5 text-4xl font-bold text-foreground/[0.06] transition-colors duration-normal group-hover:text-primary/10"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-elevated text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <h3 className="text-base font-semibold text-foreground">
                  {t(`landing.how.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-foreground-muted">
                  {t(`landing.how.steps.${key}.body`)}
                </p>
              </article>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}

/* ========================================================================== */
/* 2. Repair workflow — the real status machine, visualised                    */
/* ========================================================================== */

/** Happy path order; `waiting_parts` and `cancelled` are branches. */
const WORKFLOW_STAGES = [
  'received',
  'diagnosing',
  'waiting_customer',
  'approved',
  'in_repair',
  'ready',
  'delivered',
] as const;

/** The sample ticket is mid-flight at this index. */
const CURRENT_INDEX = 4;

export function WorkflowSection() {
  const { t } = useTranslation();

  return (
    <Section id="workflow" className="relative">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(34,211,238,0.09),transparent_55%)]" />
      </div>

      <div className="relative grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
        <Reveal>
          <SectionHeading
            align="start"
            overline={t('landing.workflow.overline')}
            title={t('landing.workflow.title')}
            subtitle={t('landing.workflow.subtitle')}
          />

          <dl className="mt-9 space-y-4 border-s-2 border-border ps-5">
            <div>
              <dt className="text-sm font-medium text-foreground">
                {t('landing.how.steps.diagnose.title')}
              </dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                {t('landing.how.steps.diagnose.body')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-foreground">
                {t('landing.workflow.stages.waiting_customer')}
              </dt>
              <dd className="mt-1 text-sm text-foreground-muted">
                {t('landing.features.items.approvals.body')}
              </dd>
            </div>
          </dl>
        </Reveal>

        {/* ---------- Ticket card ---------- */}
        <Reveal delay={0.1}>
          <div className="rf-panel-raised overflow-hidden">
            {/* Ticket header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface/50 p-5">
              <div className="min-w-0">
                <p className="rf-overline">{t('landing.tracking.mock.title')}</p>
                <p className="numeric mt-1.5 text-lg font-semibold text-foreground" dir="ltr">
                  {t('landing.workflow.sample.code')}
                </p>
                <p className="mt-1 truncate text-sm text-foreground-muted">
                  {t('landing.workflow.sample.device')}
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary">
                <span className="rf-live-dot" aria-hidden="true" />
                {t('landing.workflow.stages.in_repair')}
              </span>
            </div>

            {/* Ticket meta */}
            <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2">
              <div>
                <p className="rf-overline">{t('landing.features.items.tickets.title')}</p>
                <p className="mt-1.5 text-sm text-foreground-muted">
                  {t('landing.workflow.sample.issue')}
                </p>
              </div>
              <div className="sm:border-s sm:border-border sm:ps-5">
                <p className="rf-overline">{t('nav.technicians')}</p>
                <p className="mt-1.5 flex items-center gap-2 text-sm text-foreground">
                  <HardHat className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  {t('landing.workflow.sample.technician')}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
                  <CalendarCheck
                    className="h-4 w-4 shrink-0 text-foreground-subtle"
                    aria-hidden="true"
                  />
                  {t('landing.workflow.sample.eta')}
                </p>
              </div>
            </div>

            {/* ---------- Timeline ---------- */}
            <ol className="p-5">
              {WORKFLOW_STAGES.map((stage, index) => {
                const isComplete = index < CURRENT_INDEX;
                const isCurrent = index === CURRENT_INDEX;
                const isUpcoming = index > CURRENT_INDEX;

                return (
                  <li key={stage} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Connector */}
                    {index < WORKFLOW_STAGES.length - 1 && (
                      <span
                        className={cn(
                          'absolute top-7 h-full w-px start-[0.6875rem]',
                          isComplete ? 'bg-success/40' : 'bg-border'
                        )}
                        aria-hidden="true"
                      />
                    )}

                    {/* Marker */}
                    <span
                      className={cn(
                        'relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                        isComplete && 'border-success bg-success text-success-foreground',
                        isCurrent && 'border-primary bg-primary-soft',
                        isUpcoming && 'border-border bg-surface'
                      )}
                      aria-hidden="true"
                    >
                      {isComplete && <PackageCheck className="h-3 w-3" />}
                      {isCurrent && (
                        <>
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" />
                        </>
                      )}
                    </span>

                    {/* Label */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className={cn(
                          'text-sm font-medium',
                          isUpcoming ? 'text-foreground-subtle' : 'text-foreground'
                        )}
                      >
                        {t(`landing.workflow.stages.${stage}`)}
                      </p>
                      <p className="mt-0.5 text-xs text-foreground-subtle">
                        {isComplete
                          ? t('landing.workflow.completed')
                          : isCurrent
                            ? t('landing.workflow.current')
                            : t('landing.workflow.upcoming')}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="border-t border-border bg-surface/40 px-5 py-3.5">
              <p className="numeric text-xs text-foreground-subtle">
                {t('landing.workflow.sample.progress', {
                  current: String(CURRENT_INDEX + 1),
                  total: String(WORKFLOW_STAGES.length),
                })}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ========================================================================== */
/* 3. Features grid                                                            */
/* ========================================================================== */

const FEATURE_ICONS = {
  tickets: ClipboardList,
  inventory: Boxes,
  technicians: HardHat,
  approvals: BadgeCheck,
  finance: Wallet,
  tracking: ScanSearch,
} as const;

export function FeaturesSection() {
  const { t } = useTranslation();
  const keys = Object.keys(FEATURE_ICONS) as Array<keyof typeof FEATURE_ICONS>;

  return (
    <Section id="features" className="border-y border-border bg-surface/30">
      <Reveal>
        <SectionHeading
          overline={t('landing.features.overline')}
          title={t('landing.features.title')}
          subtitle={t('landing.features.subtitle')}
        />
      </Reveal>

      <RevealGroup className="mt-14 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const Icon = FEATURE_ICONS[key];

          return (
            <RevealItem key={key} className="bg-surface">
              <article className="group h-full p-6 transition-colors duration-normal hover:bg-surface-hover">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-elevated text-secondary transition-colors duration-normal group-hover:border-secondary/40">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>

                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  {t(`landing.features.items.${key}.title`)}
                </h3>

                <p className="mt-2 text-sm text-foreground-muted">
                  {t(`landing.features.items.${key}.body`)}
                </p>
              </article>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </Section>
  );
}

/* ========================================================================== */
/* 4. Analytics preview                                                        */
/* ========================================================================== */

export function AnalyticsSection() {
  const { t } = useTranslation();

  const metrics = [
    { key: 'activeRepairs', value: '38' },
    { key: 'awaitingApproval', value: '12' },
    { key: 'readyPickup', value: '9' },
    { key: 'revenueMonth', value: '412,850' },
    { key: 'outstanding', value: '63,400' },
    { key: 'lowStock', value: '7' },
  ] as const;

  const chartLabels = [
    t('landing.analytics.charts.repairsOverTime'),
    t('landing.analytics.charts.statusMix'),
    t('landing.analytics.charts.revenue'),
    t('landing.analytics.charts.brands'),
    t('landing.analytics.charts.technicians'),
    t('landing.analytics.charts.inventory'),
  ];

  return (
    <Section id="analytics">
      <Reveal>
        <SectionHeading
          overline={t('landing.analytics.overline')}
          title={t('landing.analytics.title')}
          subtitle={t('landing.analytics.subtitle')}
        />
      </Reveal>

      <Reveal delay={0.08} className="mt-14">
        <div className="rf-panel overflow-hidden">
          {/* Metric strip */}
          <dl className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-6">
            {metrics.map((metric) => (
              <div key={metric.key} className="bg-surface p-5">
                <dt className="text-xs text-foreground-subtle">
                  {t(`landing.analytics.metrics.${metric.key}`)}
                </dt>
                <dd className="numeric mt-2 text-xl font-bold text-foreground">{metric.value}</dd>
              </div>
            ))}
          </dl>

          {/* Chart area — a static preview. Live charts arrive in Phase 11. */}
          <div className="border-t border-border p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">
                  {t('landing.analytics.charts.repairsOverTime')}
                </p>
              </div>
              <span className="rounded-md border border-border bg-surface-sunken px-2.5 py-1 text-2xs text-foreground-subtle">
                {t('common.last30Days')}
              </span>
            </div>

            {/* CSS bar chart — no chart library loaded on the marketing page. */}
            <div className="flex h-40 items-end gap-1.5 sm:gap-2.5" aria-hidden="true">
              {[38, 52, 44, 61, 55, 72, 66, 84, 76, 91, 82, 96].map((height, index) => (
                <div key={index} className="group relative flex-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-primary/25 to-primary/70 transition-all duration-normal ease-soft group-hover:from-primary/40 group-hover:to-secondary/80"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-2xs text-foreground-subtle">
              <span>{t('common.last30Days')}</span>
              <span className="numeric">1 – 30</span>
            </div>

            {/* Chart legend */}
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2.5 border-t border-border pt-5">
              {chartLabels.slice(1).map((label) => (
                <li key={label} className="flex items-center gap-2 text-xs text-foreground-muted">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-secondary/70"
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
