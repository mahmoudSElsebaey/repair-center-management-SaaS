import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { NotificationItem } from '@/features/notifications/components/NotificationItem';
import { useNotifications } from '@/features/notifications/useNotifications';
import { useToast } from '@/components/feedback/Toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

/**
 * Full notifications screen.
 *
 * The bell shows the latest few; this page is where a user works through the
 * backlog, filters to unread, and dismisses what no longer matters.
 */
export default function NotificationsPage() {
  const { t } = useTranslation();
  const notify = useToast();
  useDocumentTitle(t('notifications.title'));

  const { items, unread, isLoading, isRefreshing, error, reload, markRead, markAllRead, remove } =
    useNotifications({ limit: PAGE_SIZE, poll: true });

  const [unreadOnly, setUnreadOnly] = useState(false);

  const visible = unreadOnly ? items.filter((item) => !item.read) : items;

  const handleMarkAll = async () => {
    await markAllRead();
    notify.success(t('notifications.allMarkedRead'));
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl space-y-5">
        {/* ------------------------------------------------------- heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{t('notifications.title')}</h1>
            <p className="mt-1.5 text-sm text-foreground-muted">{t('notifications.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<CheckCheck className="h-4 w-4" />}
                onClick={handleMarkAll}
              >
                {t('notifications.markAllRead')}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void reload()}
              disabled={isRefreshing}
              leadingIcon={
                isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />
              }
            >
              {t('common.retry')}
            </Button>
          </div>
        </div>

        {/* -------------------------------------------------------- filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            className={cn(
              'inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors duration-fast',
              !unreadOnly
                ? 'border-primary/30 bg-primary-soft text-primary'
                : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
            )}
          >
            {t('notifications.showAll')}
          </button>

          <button
            type="button"
            onClick={() => setUnreadOnly(true)}
            className={cn(
              'inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors duration-fast',
              unreadOnly
                ? 'border-primary/30 bg-primary-soft text-primary'
                : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
            )}
          >
            {t('notifications.unreadOnly')}
            {unread > 0 && (
              <span className="numeric rounded bg-danger px-1.5 text-[10px] font-semibold text-danger-foreground">
                {unread}
              </span>
            )}
          </button>
        </div>

        {/* ---------------------------------------------------------- list */}
        {error ? (
          <ErrorState
            title={t('states.errorTitle')}
            description={error}
            onRetry={() => void reload()}
            retryLabel={t('common.retry')}
          />
        ) : isLoading && items.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rf-skeleton h-20" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            size="lg"
            icon={<Bell className="h-6 w-6" />}
            title={t('notifications.empty')}
            description={t('notifications.emptyBody')}
            action={
              unreadOnly ? (
                <Button variant="outline" onClick={() => setUnreadOnly(false)}>
                  {t('notifications.showAll')}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="space-y-2">
            {visible.map((notification) => (
              <li key={notification.id}>
                <NotificationItem
                  notification={notification}
                  onMarkRead={markRead}
                  onDismiss={remove}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
