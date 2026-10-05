import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { PRIORITY_STYLES, STATUS_STYLES } from '../workflow';
import type { RepairPriority, RepairStatus } from '@/types/domain';

/** Status pill. Colour comes from the workflow metadata, never a local literal. */
export function StatusBadge({
  status,
  size = 'md',
  className,
}: {
  status: RepairStatus;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t } = useTranslation();
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.received;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium',
        size === 'sm' ? 'h-5 px-2 text-2xs' : 'h-6 px-2.5 text-xs',
        styles.chip,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} aria-hidden="true" />
      {t(`repairs.status.${status}`)}
    </span>
  );
}

/** Priority pill. */
export function PriorityBadge({
  priority,
  size = 'md',
  className,
}: {
  priority: RepairPriority;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { t } = useTranslation();
  const styles = PRIORITY_STYLES[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-md border font-medium',
        size === 'sm' ? 'h-5 px-2 text-2xs' : 'h-6 px-2.5 text-xs',
        styles.chip,
        className
      )}
    >
      {t(styles.labelKey)}
    </span>
  );
}

/** Ticket code, always rendered LTR so it never scrambles inside Arabic text. */
export function TicketCode({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  return (
    <span className={cn('numeric font-medium text-foreground', className)} dir="ltr">
      {code}
    </span>
  );
}

export { Badge };
