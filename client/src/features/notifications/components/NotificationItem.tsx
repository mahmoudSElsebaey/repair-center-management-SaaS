import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, CheckCircle2, Info, PackageSearch, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { activeLocale, translate } from '@/lib/i18nText';
import { formatRelativeTime } from '@/lib/utils';
import type { AppNotification, NotificationSeverity } from '../types';

const SEVERITY_STYLES: Record<
  NotificationSeverity,
  { icon: React.ReactNode; accent: string; ring: string }
> = {
  info: {
    icon: <Info className="h-4 w-4" />,
    accent: 'text-info',
    ring: 'border-info/25 bg-info-soft',
  },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: 'text-success',
    ring: 'border-success/25 bg-success-soft',
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    accent: 'text-warning',
    ring: 'border-warning/25 bg-warning-soft',
  },
  critical: {
    icon: <BellRing className="h-4 w-4" />,
    accent: 'text-danger',
    ring: 'border-danger/25 bg-danger-soft',
  },
};

/**
 * One notification row.
 *
 * The body is composed from i18n keys plus the params the server stored, so the
 * wording lives in the locale files rather than being baked into the database —
 * the same notification reads correctly in Arabic and English.
 */
export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  compact = false,
}: {
  notification: AppNotification;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const locale = activeLocale();

  const severity = SEVERITY_STYLES[notification.severity] ?? SEVERITY_STYLES.info;

  // Dynamic keys from the database — resolved through the typed helper.
  const title = translate(notification.titleKey, notification.params);
  const body = notification.bodyKey
    ? translate(notification.bodyKey, notification.params)
    : undefined;

  const content = (
    <>
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
          severity.ring,
          severity.accent
        )}
        aria-hidden="true"
      >
        {notification.type === 'low_stock' ? (
          <PackageSearch className="h-4 w-4" />
        ) : (
          severity.icon
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 text-sm',
              notification.read ? 'text-foreground-muted' : 'font-medium text-foreground'
            )}
          >
            {title}
          </span>

          {!notification.read && (
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
              aria-label={t('notifications.severity.info')}
            />
          )}
        </span>

        {body && !compact && (
          <span className="mt-1 block text-xs leading-relaxed text-foreground-subtle">
            {body}
          </span>
        )}

        <span className="mt-1.5 block text-2xs text-foreground-subtle">
          {formatRelativeTime(notification.createdAt, locale)}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-lg border p-3 transition-colors duration-fast',
        notification.read
          ? 'border-transparent hover:bg-surface-hover'
          : 'border-border bg-surface hover:bg-surface-hover'
      )}
    >
      {notification.link ? (
        <Link
          to={notification.link}
          onClick={() => !notification.read && onMarkRead?.(notification.id)}
          className="flex min-w-0 flex-1 gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 gap-3">{content}</div>
      )}

      {(onDismiss || (!notification.read && onMarkRead)) && (
        <span className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100 focus-within:opacity-100">
          {!notification.read && onMarkRead && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              title={t('notifications.markRead')}
              aria-label={t('notifications.markRead')}
              className="flex h-6 w-6 items-center justify-center rounded text-foreground-subtle transition-colors hover:bg-background hover:text-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(notification.id)}
              title={t('common.close')}
              aria-label={t('common.close')}
              className="flex h-6 w-6 items-center justify-center rounded text-foreground-subtle transition-colors hover:bg-background hover:text-danger"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
