import {
  REPAIR_HAPPY_PATH,
  type RepairPriority,
  type RepairStatus,
} from '@/types/domain';

/**
 * Presentation metadata for the repair workflow.
 *
 * The set of statuses and their order come from the shared domain vocabulary;
 * this file only decides how they look. Keeping the two apart means a change to
 * the workflow is a change in `types/domain.ts`, not in a component.
 */

/** Tailwind classes per status, used for pills, dots and timeline markers. */
export const STATUS_STYLES: Record<
  RepairStatus,
  { chip: string; dot: string; ring: string }
> = {
  received: {
    chip: 'border-border bg-surface-hover text-foreground-muted',
    dot: 'bg-[var(--status-received)]',
    ring: 'border-[var(--status-received)]',
  },
  diagnosing: {
    chip: 'border-info/25 bg-info-soft text-info',
    dot: 'bg-[var(--status-diagnosing)]',
    ring: 'border-[var(--status-diagnosing)]',
  },
  waiting_customer: {
    chip: 'border-warning/25 bg-warning-soft text-warning',
    dot: 'bg-[var(--status-waiting-customer)]',
    ring: 'border-[var(--status-waiting-customer)]',
  },
  approved: {
    chip: 'border-secondary/25 bg-secondary-soft text-secondary',
    dot: 'bg-[var(--status-approved)]',
    ring: 'border-[var(--status-approved)]',
  },
  in_repair: {
    chip: 'border-primary/25 bg-primary-soft text-primary',
    dot: 'bg-[var(--status-in-repair)]',
    ring: 'border-[var(--status-in-repair)]',
  },
  waiting_parts: {
    chip: 'border-accent/25 bg-accent-soft text-accent',
    dot: 'bg-[var(--status-waiting-parts)]',
    ring: 'border-[var(--status-waiting-parts)]',
  },
  ready: {
    chip: 'border-success/25 bg-success-soft text-success',
    dot: 'bg-[var(--status-ready)]',
    ring: 'border-[var(--status-ready)]',
  },
  delivered: {
    chip: 'border-success/25 bg-success-soft text-success',
    dot: 'bg-[var(--status-delivered)]',
    ring: 'border-[var(--status-delivered)]',
  },
  cancelled: {
    chip: 'border-danger/25 bg-danger-soft text-danger',
    dot: 'bg-[var(--status-cancelled)]',
    ring: 'border-[var(--status-cancelled)]',
  },
};

export const PRIORITY_STYLES: Record<
  RepairPriority,
  { chip: string; labelKey: string }
> = {
  low: { chip: 'border-border bg-surface-hover text-foreground-subtle', labelKey: 'repairs.priority.low' },
  normal: { chip: 'border-border bg-surface-hover text-foreground-muted', labelKey: 'repairs.priority.normal' },
  high: { chip: 'border-warning/25 bg-warning-soft text-warning', labelKey: 'repairs.priority.high' },
  urgent: { chip: 'border-danger/25 bg-danger-soft text-danger', labelKey: 'repairs.priority.urgent' },
};

/** The happy-path stages, in order, for the progress timeline. */
export const HAPPY_PATH = REPAIR_HAPPY_PATH;

/**
 * Position of a status on the happy path.
 *
 * `waiting_parts` shares a position with `in_repair` because it is a pause
 * inside that stage rather than a stage of its own — showing it as a separate
 * step would imply the repair restarts when the part arrives.
 */
export function happyPathIndex(status: RepairStatus): number {
  if (status === 'waiting_parts') return HAPPY_PATH.indexOf('in_repair');
  if (status === 'cancelled') return -1;
  return HAPPY_PATH.indexOf(status);
}

/** Statuses grouped for the list filter, so the tabs are not overwhelming. */
export const STATUS_FILTER_GROUPS = [
  { key: 'active', statuses: ['diagnosing', 'approved', 'in_repair', 'waiting_parts'] },
  { key: 'waiting', statuses: ['waiting_customer', 'waiting_parts'] },
  { key: 'ready', statuses: ['ready'] },
  { key: 'closed', statuses: ['delivered', 'cancelled'] },
] as const;
