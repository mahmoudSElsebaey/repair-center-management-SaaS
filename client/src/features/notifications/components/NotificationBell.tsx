import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '../useNotifications';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Topbar notification bell.
 *
 * The badge reflects the live unread count, the panel shows the most recent
 * handful, and "view all" leads to the full notifications screen. Out-of-scope
 * interactions (outside click, Escape) close it, matching the account menu.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const { items, unread, isLoading, markRead, markAllRead, reload } = useNotifications({ limit: 6 });

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Refresh when the panel opens so it is never showing a stale list.
  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const badge = unread > 99 ? '99+' : String(unread);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          unread > 0
            ? `${t('dashboardShell.notifications')} — ${t('notifications.unreadCount', { count: unread })}`
            : t('dashboardShell.notifications')
        }
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface',
          'text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          className
        )}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="numeric absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-danger-foreground">
            {badge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('notifications.title')}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: prefersReduced ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute end-0 top-[calc(100%+0.5rem)] z-raised w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-elevated shadow-lg"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{t('notifications.title')}</p>

              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs font-medium text-primary transition-colors duration-fast hover:bg-primary-soft"
                >
                  <CheckCheck className="h-3 w-3" aria-hidden="true" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-[22rem] overflow-y-auto p-2">
              {isLoading && items.length === 0 ? (
                <div className="space-y-2 p-2">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="rf-skeleton h-14" aria-hidden="true" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-3 h-6 w-6 text-foreground-subtle" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">
                    {t('dashboardShell.noNotifications')}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {t('dashboardShell.noNotificationsBody')}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {items.map((notification) => (
                    <li key={notification.id}>
                      <NotificationItem
                        notification={notification}
                        onMarkRead={markRead}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-2">
              <Link
                to="/app/notifications"
                onClick={() => setOpen(false)}
                className="flex h-9 items-center justify-center rounded-lg text-sm font-medium text-primary transition-colors duration-fast hover:bg-primary-soft"
              >
                {t('notifications.viewAll')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
