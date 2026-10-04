import { useTranslation } from 'react-i18next';
import { Check, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HAPPY_PATH, STATUS_STYLES, happyPathIndex } from '../workflow';
import { activeLocale } from '@/lib/i18nText';
import { formatDate } from '@/lib/utils';
import type { RepairStatus, StatusHistoryEntry } from '../types';

/**
 * Visual progress of a ticket through the workshop.
 *
 * The happy path is shown as a fixed sequence rather than only the stages the
 * ticket has touched, because the value of a timeline here is telling the
 * customer how much is left — not just what has happened.
 *
 * `waiting_parts` maps onto the `in_repair` position: it is a pause inside that
 * stage, so showing it as a separate step would imply the repair restarts.
 */
export function RepairTimeline({
  status,
  history,
  compact = false,
}: {
  status: RepairStatus;
  history?: StatusHistoryEntry[];
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const locale = activeLocale();

  const cancelled = status === 'cancelled';
  const currentIndex = happyPathIndex(status);

  /** Most recent history entry for a stage, so dates can be shown per step. */
  const reachedAt = new Map<RepairStatus, string>();
  for (const entry of history ?? []) {
    reachedAt.set(entry.to, entry.at);
  }

  return (
    <div>
      {cancelled && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3">
          <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{t('repairs.timeline.cancelled')}</p>
        </div>
      )}

      <ol className={cn('relative', compact ? 'space-y-0' : 'space-y-0')}>
        {HAPPY_PATH.map((stage, index) => {
          const isComplete = !cancelled && index < currentIndex;
          const isCurrent = !cancelled && index === currentIndex;
          const isUpcoming = cancelled || index > currentIndex;
          const styles = STATUS_STYLES[stage];
          const at = reachedAt.get(stage);

          return (
            <li key={stage} className="relative flex gap-4 pb-5 last:pb-0">
              {index < HAPPY_PATH.length - 1 && (
                <span
                  className={cn(
                    'absolute top-7 h-full w-px start-[0.6875rem]',
                    isComplete ? 'bg-success/40' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}

              <span
                className={cn(
                  'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                  isComplete && 'border-success bg-success text-success-foreground',
                  isCurrent && cn('bg-surface', styles.ring),
                  isUpcoming && 'border-border bg-surface'
                )}
                aria-hidden="true"
              >
                {isComplete && <Check className="h-3 w-3" />}
                {isCurrent && <span className={cn('h-2 w-2 rounded-full', styles.dot)} />}
                {isUpcoming && <Circle className="h-2 w-2 text-foreground-subtle/40" />}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isUpcoming ? 'text-foreground-subtle' : 'text-foreground'
                    )}
                  >
                    {t(`repairs.status.${stage}`)}
                  </p>

                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-2xs',
                      isComplete && 'bg-success-soft text-success',
                      isCurrent && 'bg-primary-soft text-primary',
                      isUpcoming && 'bg-surface-hover text-foreground-subtle'
                    )}
                  >
                    {isComplete
                      ? t('repairs.timeline.completed')
                      : isCurrent
                        ? t('repairs.timeline.current')
                        : t('repairs.timeline.upcoming')}
                  </span>
                </div>

                {at && !isUpcoming && (
                  <p className="mt-0.5 text-2xs text-foreground-subtle">
                    {formatDate(at, locale, {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Full audit trail of the ticket, including branches the progress bar cannot
 * show — a move to `waiting_parts`, a return to `in_repair`, a cancellation.
 */
export function RepairHistory({ history }: { history: StatusHistoryEntry[] }) {
  const { t } = useTranslation();
  const locale = activeLocale();

  if (history.length === 0) {
    return <p className="text-sm text-foreground-subtle">{t('common.notAvailable')}</p>;
  }

  return (
    <ol className="space-y-0">
      {history
        .slice()
        .reverse()
        .map((entry, index, all) => (
          <li key={`${entry.to}-${entry.at}`} className="relative flex gap-3.5 pb-4 last:pb-0">
            {index < all.length - 1 && (
              <span
                className="absolute top-6 h-full w-px bg-border start-[0.5625rem]"
                aria-hidden="true"
              />
            )}

            <span
              className={cn(
                'relative z-10 mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 rounded-full border-2 bg-surface',
                STATUS_STYLES[entry.to].ring
              )}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                {entry.from
                  ? t('repairs.history.moved', {
                      from: t(`repairs.status.${entry.from}`),
                      to: t(`repairs.status.${entry.to}`),
                    })
                  : t('repairs.history.opened', { status: t(`repairs.status.${entry.to}`) })}
              </p>

              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-foreground-subtle">
                <span>
                  {formatDate(entry.at, locale, {
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {entry.byName && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{entry.byName}</span>
                  </>
                )}
                {entry.byRole && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{t(`roles.${entry.byRole}`, { defaultValue: entry.byRole })}</span>
                  </>
                )}
              </p>

              {entry.note && (
                <p className="mt-1 rounded-md border border-border bg-surface-sunken px-2.5 py-1.5 text-xs text-foreground-muted">
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        ))}
    </ol>
  );
}
