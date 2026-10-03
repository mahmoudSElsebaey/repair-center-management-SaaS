import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CheckCircle2,
  MapPin,
  PlusCircle,
  QrCode,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

/* ========================================================================== */
/* Inventory                                                                   */
/* ========================================================================== */

type StockLevel = 'ok' | 'low' | 'out';

const INVENTORY_ROWS: Array<{
  sku: string;
  key: 'oled' | 'battery' | 'hinge' | 'thermal' | 'port';
  bin: string;
  onHand: number;
  minimum: number;
  level: StockLevel;
}> = [
  { sku: 'SCR-S24U-OLED', key: 'oled', bin: 'A-02', onHand: 6, minimum: 4, level: 'ok' },
  { sku: 'BAT-IP14-OEM', key: 'battery', bin: 'A-05', onHand: 2, minimum: 5, level: 'low' },
  { sku: 'HNG-MBA-M2', key: 'hinge', bin: 'C-11', onHand: 0, minimum: 2, level: 'out' },
  { sku: 'THM-MX4-4G', key: 'thermal', bin: 'D-01', onHand: 34, minimum: 10, level: 'ok' },
  { sku: 'PRT-T14-USBC', key: 'port', bin: 'B-07', onHand: 4, minimum: 3, level: 'ok' },
];

const LEVEL_STYLES: Record<StockLevel, { chip: string; icon: React.ReactNode }> = {
  ok: {
    chip: 'border-success/25 bg-success-soft text-success',
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  low: {
    chip: 'border-warning/25 bg-warning-soft text-warning',
    icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
  out: {
    chip: 'border-danger/25 bg-danger-soft text-danger',
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden="true" />,
  },
};

export function InventorySection() {
  const { t } = useTranslation();

  const bullets = [
    { key: 'lowStock', icon: BellRing },
    { key: 'value', icon: TrendingUp },
    { key: 'movement', icon: Boxes },
  ] as const;

  return (
    <Section id="inventory" className="border-y border-border bg-surface/30">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <Reveal>
          <SectionHeading
            align="start"
            overline={t('landing.inventory.overline')}
            title={t('landing.inventory.title')}
            subtitle={t('landing.inventory.subtitle')}
          />

          <ul className="mt-9 space-y-4">
            {bullets.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3.5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-secondary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="pt-1.5 text-sm text-foreground-muted">
                  {t(`landing.inventory.bullets.${key}`)}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rf-panel overflow-hidden">
            {/* Panel header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-sm font-semibold text-foreground">{t('nav.inventory')}</p>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/25 bg-warning-soft px-2.5 py-1 text-2xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                {t('landing.inventory.sample.low')} · 2
              </span>
            </div>

            {/* Table — horizontally scrollable rather than crushed on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-sunken text-start">
                    <th className="px-4 py-3 text-start text-2xs font-semibold uppercase tracking-wide text-foreground-subtle">
                      {t('landing.inventory.sample.part')}
                    </th>
                    <th className="px-4 py-3 text-start text-2xs font-semibold uppercase tracking-wide text-foreground-subtle">
                      {t('landing.inventory.sample.location')}
                    </th>
                    <th className="px-4 py-3 text-end text-2xs font-semibold uppercase tracking-wide text-foreground-subtle">
                      {t('landing.inventory.sample.onHand')}
                    </th>
                    <th className="px-4 py-3 text-end text-2xs font-semibold uppercase tracking-wide text-foreground-subtle">
                      {t('landing.inventory.sample.minimum')}
                    </th>
                    <th className="px-4 py-3 text-end text-2xs font-semibold uppercase tracking-wide text-foreground-subtle">
                      {t('landing.inventory.sample.status')}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {INVENTORY_ROWS.map((row) => {
                    const level = LEVEL_STYLES[row.level];

                    return (
                      <tr
                        key={row.sku}
                        className="border-b border-border-soft transition-colors duration-fast last:border-b-0 hover:bg-surface-hover"
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-foreground">
                            {t(`landing.inventory.sample.items.${row.key}`)}
                          </p>
                          <p className="numeric mt-0.5 text-2xs text-foreground-subtle" dir="ltr">
                            {row.sku}
                          </p>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span className="numeric">{row.bin}</span>
                          </span>
                        </td>

                        <td className="numeric px-4 py-3.5 text-end font-medium text-foreground">
                          {row.onHand}
                        </td>

                        <td className="numeric px-4 py-3.5 text-end text-foreground-muted">
                          {row.minimum}
                        </td>

                        <td className="px-4 py-3.5 text-end">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-2xs font-medium',
                              level.chip
                            )}
                          >
                            {level.icon}
                            {t(`landing.inventory.sample.${row.level}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Movement ledger footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/40 px-5 py-3.5">
              <div className="flex items-center gap-4 text-2xs text-foreground-subtle">
                <span className="inline-flex items-center gap-1.5">
                  <PlusCircle className="h-3 w-3 text-success" aria-hidden="true" />
                  purchase
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-primary" aria-hidden="true" />
                  usage
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-foreground-subtle" aria-hidden="true" />
                  transfer
                </span>
              </div>

              <span className="text-2xs text-foreground-subtle">
                {t('landing.inventory.bullets.movement')}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ========================================================================== */
/* Customer tracking                                                           */
/* ========================================================================== */

const TRACKING_STEPS = [
  { key: 'received', state: 'done' },
  { key: 'diagnosis', state: 'done' },
  { key: 'approved', state: 'done' },
  { key: 'inRepair', state: 'current' },
  { key: 'quality', state: 'todo' },
  { key: 'ready', state: 'todo' },
] as const;

export function TrackingSection() {
  const { t } = useTranslation();

  return (
    <Section id="tracking">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <Reveal>
          <SectionHeading
            align="start"
            overline={t('landing.tracking.overline')}
            title={t('landing.tracking.title')}
            subtitle={t('landing.tracking.subtitle')}
          />

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button
              trailingIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => window.location.assign('/login')}
            >
              {t('landing.cta.primary')}
            </Button>

            <span className="inline-flex items-center gap-2 text-xs text-foreground-subtle">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('landing.tracking.mock.guaranteed')}
            </span>
          </div>
        </Reveal>

        {/* Mobile-first tracking mock */}
        <Reveal delay={0.1} className="flex justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            {/* Device frame */}
            <div className="rf-panel-raised overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-surface/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <p className="text-xs font-medium text-foreground">
                    {t('landing.tracking.mock.title')}
                  </p>
                </div>
                <span className="rf-live-dot" aria-hidden="true" />
              </div>

              <div className="p-5">
                <p className="numeric text-sm font-semibold text-foreground" dir="ltr">
                  RF-2026-00421
                </p>
                <p className="mt-1 text-xs text-foreground-subtle">
                  {t('landing.tracking.mock.updated')}
                </p>

                <div className="mt-4 rounded-lg border border-primary/25 bg-primary-soft px-3.5 py-2.5">
                  <p className="text-2xs uppercase tracking-wide text-primary/80">
                    {t('landing.tracking.mock.status')}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {t('landing.tracking.mock.steps.inRepair')}
                  </p>
                </div>

                <ol className="mt-5 space-y-0">
                  {TRACKING_STEPS.map((step, index) => {
                    const isDone = step.state === 'done';
                    const isCurrent = step.state === 'current';

                    return (
                      <li key={step.key} className="relative flex gap-3.5 pb-5 last:pb-0">
                        {index < TRACKING_STEPS.length - 1 && (
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
                            step.state === 'todo' && 'border-border bg-surface'
                          )}
                          aria-hidden="true"
                        >
                          {isDone && <CheckCircle2 className="h-2.5 w-2.5 text-success-foreground" />}
                          {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </span>

                        <p
                          className={cn(
                            'pt-0.5 text-xs',
                            step.state === 'todo'
                              ? 'text-foreground-subtle'
                              : 'font-medium text-foreground'
                          )}
                        >
                          {t(`landing.tracking.mock.steps.${step.key}`)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="border-t border-border bg-surface/40 px-5 py-3">
                <p className="text-2xs text-foreground-subtle">
                  {t('landing.tracking.mock.guaranteed')}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
