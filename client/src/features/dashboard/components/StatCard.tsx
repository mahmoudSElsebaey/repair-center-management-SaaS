import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Operational metric tile.
 *
 * `value === null` renders an explicit "not available yet" state rather than a
 * zero. A repair centre reading `0` when the real answer is "we do not track
 * that yet" would draw the wrong conclusion, so the two are never conflated.
 */
export interface StatCardProps {
  label: string;
  value: number | string | null;
  icon: React.ReactNode;
  /** Optional secondary line, e.g. "across all branches". */
  hint?: string;
  tone?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'danger';
  /** Percentage change versus the previous period, when it is known. */
  trend?: number | null;
  loading?: boolean;
  className?: string;
}

const TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-foreground-subtle',
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'default',
  trend,
  loading = false,
  className,
}: StatCardProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={cn('rf-panel p-5', className)}>
        <div className="rf-skeleton mb-3 h-3 w-20" />
        <div className="rf-skeleton h-7 w-16" />
      </div>
    );
  }

  const isPending = value === null;

  return (
    <div
      className={cn(
        'rf-panel relative overflow-hidden p-5 transition-all duration-normal ease-soft',
        'hover:border-border-strong hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground-subtle">{label}</p>

          {isPending ? (
            <p className="mt-2.5 text-sm font-medium text-foreground-subtle">
              {t('dashboard.pendingValue')}
            </p>
          ) : (
            <p className="numeric mt-2 text-2xl font-bold text-foreground">{value}</p>
          )}
        </div>

        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated',
            TONES[tone]
          )}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {typeof trend === 'number' && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-medium',
              trend > 0 && 'bg-success-soft text-success',
              trend < 0 && 'bg-danger-soft text-danger',
              trend === 0 && 'bg-surface-hover text-foreground-subtle'
            )}
          >
            {trend > 0 ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            ) : trend < 0 ? (
              <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Minus className="h-3 w-3" aria-hidden="true" />
            )}
            {Math.abs(trend)}%
          </span>
        )}

        {hint && <p className="truncate text-2xs text-foreground-subtle">{hint}</p>}
      </div>
    </div>
  );
}
