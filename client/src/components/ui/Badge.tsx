import { cn } from '@/lib/utils';
import type { RepairStatus } from '@/types/domain';

type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Adds a leading status dot — used for live or stateful values. */
  withDot?: boolean;
  icon?: React.ReactNode;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-hover text-foreground-muted border-border',
  primary: 'bg-primary-soft text-primary border-primary/25',
  secondary: 'bg-secondary-soft text-secondary border-secondary/25',
  accent: 'bg-accent-soft text-accent border-accent/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'h-5 px-2 text-2xs gap-1 rounded',
  md: 'h-6 px-2.5 text-xs gap-1.5 rounded-md',
};

export function Badge({
  className,
  tone = 'neutral',
  size = 'md',
  withDot = false,
  icon,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap border font-medium',
        TONES[tone],
        SIZES[size],
        className
      )}
      {...props}
    >
      {withDot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Status-specific badge                                                       */
/* -------------------------------------------------------------------------- */

const STATUS_TONES: Record<RepairStatus, BadgeTone> = {
  received: 'neutral',
  diagnosing: 'info',
  waiting_customer: 'warning',
  approved: 'secondary',
  in_repair: 'primary',
  waiting_parts: 'accent',
  ready: 'success',
  delivered: 'success',
  cancelled: 'danger',
};

/**
 * Renders a repair status with a consistent tone everywhere it appears.
 * The label is passed in already translated so this component stays i18n-free.
 */
export function StatusBadge({
  status,
  label,
  size = 'md',
  className,
}: {
  status: RepairStatus;
  label: string;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <Badge tone={STATUS_TONES[status]} size={size} withDot className={className}>
      {label}
    </Badge>
  );
}

export const REPAIR_STATUS_TONE = STATUS_TONES;
