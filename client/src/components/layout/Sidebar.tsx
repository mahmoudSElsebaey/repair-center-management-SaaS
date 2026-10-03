import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, Lock } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { visibleNavGroups } from '@/config/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMobileNav, toggleSidebar } from '@/store/uiSlice';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn, initials } from '@/lib/utils';

/**
 * Operations sidebar.
 *
 * Renders from the navigation model filtered by role, so a receptionist and an
 * administrator genuinely see different products. Entries belonging to a later
 * phase are shown as locked rather than hidden, which keeps the roadmap legible
 * without pretending the screen exists.
 */
export function Sidebar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const prefersReduced = useReducedMotion();

  const user = useAppSelector((state) => state.auth.user);
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const isRtl = useAppSelector((state) => state.ui.locale) === 'ar';

  const groups = visibleNavGroups(user?.role);

  const navBody = (isCollapsed: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label={t('nav.dashboard')}>
      {groups.map((group) => (
        <div key={group.key}>
          {!isCollapsed && <p className="rf-overline px-3 pb-2">{t(group.labelKey)}</p>}

          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const label = t(item.labelKey);

              if (!item.available) {
                return (
                  <li key={item.key}>
                    <span
                      title={`${label} — ${t('common.comingSoon')}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        'cursor-not-allowed text-foreground-subtle/70',
                        isCollapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{label}</span>
                          <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                        </>
                      )}
                      <span className="rf-sr-only">{t('common.comingSoon')}</span>
                    </span>
                  </li>
                );
              }

              return (
                <li key={item.key}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/app'}
                    onClick={onNavigate}
                    title={isCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                        'transition-colors duration-fast ease-soft',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                        isCollapsed && 'justify-center px-2',
                        isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active rail — flips to the correct edge in RTL automatically. */}
                        {isActive && (
                          <span
                            className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-primary"
                            aria-hidden="true"
                          />
                        )}
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const userCard = (isCollapsed: boolean) => (
    <div className="border-t border-border p-3">
      {user && (
        <div
          className={cn(
            'mb-2 flex items-center gap-3 rounded-lg px-2 py-2',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-xs font-semibold text-foreground"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-xs text-foreground-subtle">{t(`roles.${user.role}`)}</p>
            </div>
          )}
        </div>
      )}

      <LogoutButton className={cn(isCollapsed && 'justify-center px-0')} />
    </div>
  );

  return (
    <>
      {/* ---------- Desktop rail ---------- */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-e border-border bg-surface/60 lg:flex',
          'transition-[width] duration-normal ease-soft',
          collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
        )}
      >
        <div
          className={cn(
            'flex h-topbar shrink-0 items-center border-b border-border px-4',
            collapsed ? 'justify-center px-2' : 'justify-between'
          )}
        >
          <NavLink
            to="/app"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Logo variant={collapsed ? 'mark' : 'full'} size="sm" />
          </NavLink>

          {!collapsed && (
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              aria-label={t('dashboardShell.collapseSidebar')}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronsLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            </button>
          )}
        </div>

        {navBody(collapsed)}

        {collapsed && (
          <div className="flex justify-center px-2 pb-3">
            <button
              type="button"
              onClick={() => dispatch(toggleSidebar())}
              aria-label={t('dashboardShell.expandSidebar')}
              className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-subtle transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronsLeft className="h-4 w-4 rotate-180 rf-flip-rtl" aria-hidden="true" />
            </button>
          </div>
        )}

        {userCard(collapsed)}
      </aside>

      {/* ---------- Mobile drawer ---------- */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-drawer lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.18 }}
              onClick={() => dispatch(setMobileNav(false))}
              className="absolute inset-0 bg-[var(--overlay)]"
              aria-hidden="true"
            />

            {/* The drawer enters from the inline-start edge: right in RTL, left in LTR. */}
            <motion.aside
              key={isRtl ? 'rtl' : 'ltr'}
              initial={prefersReduced ? { opacity: 0 } : { x: isRtl ? '100%' : '-100%' }}
              animate={prefersReduced ? { opacity: 1 } : { x: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { x: isRtl ? '100%' : '-100%' }}
              transition={{ duration: prefersReduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'absolute inset-y-0 flex w-drawer max-w-[85vw] flex-col border-border bg-surface',
                isRtl ? 'right-0 border-s' : 'left-0 border-e'
              )}
            >
              <div className="flex h-topbar shrink-0 items-center border-b border-border px-4">
                <Logo size="sm" />
              </div>

              {navBody(false, () => dispatch(setMobileNav(false)))}
              {userCard(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
