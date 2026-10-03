import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { findNavItem } from '@/config/navigation';
import { authApi } from '@/features/auth/authApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMobileNav } from '@/store/uiSlice';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn, initials } from '@/lib/utils';

type ApiState = 'checking' | 'online' | 'offline';

/**
 * Operations topbar.
 *
 * Owns the three things that must be reachable from anywhere: where am I (the
 * page title), global search, and my account. It also surfaces live API health,
 * which in practice is the fastest way for staff to know whether a failed save
 * was their fault or the server's.
 */
export function Topbar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  const user = useAppSelector((state) => state.auth.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [apiState, setApiState] = useState<ApiState>('checking');
  const menuRef = useRef<HTMLDivElement>(null);

  const navItem = findNavItem(location.pathname);
  const pageTitle = navItem ? t(navItem.labelKey) : t('dashboard.title');

  // Health probe — proves the client can actually reach the API it is bound to.
  useEffect(() => {
    let cancelled = false;

    void authApi
      .health()
      .then(() => {
        if (!cancelled) setApiState('online');
      })
      .catch(() => {
        if (!cancelled) setApiState('offline');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  const statusTone = {
    checking: 'bg-foreground-subtle',
    online: 'bg-success',
    offline: 'bg-danger',
  }[apiState];

  const statusLabel = {
    checking: t('dashboardShell.apiChecking'),
    online: t('dashboardShell.apiConnected'),
    offline: t('dashboardShell.apiDown'),
  }[apiState];

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-topbar items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => dispatch(setMobileNav(true))}
          aria-label={t('dashboardShell.openMenu')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        <Link to="/app" className="lg:hidden" aria-label={t('brand.name')}>
          <Logo variant="mark" size="sm" />
        </Link>

        <div className="hidden min-w-0 flex-col lg:flex">
          <h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1>
          <p className="truncate text-xs text-foreground-subtle">{t('dashboard.subtitle')}</p>
        </div>

        {/* Global search */}
        <div className="relative mx-auto hidden w-full max-w-md md:block">
          <Search
            className="pointer-events-none absolute inset-y-0 start-0 ms-3 my-auto h-4 w-4 text-foreground-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            disabled
            aria-label={t('common.search')}
            placeholder={t('dashboardShell.searchPlaceholder')}
            title={t('common.comingSoon')}
            className={cn(
              'h-9 w-full rounded-lg border border-border bg-surface-sunken ps-9 pe-3 text-sm',
              'text-foreground placeholder:text-foreground-subtle',
              'disabled:cursor-not-allowed disabled:opacity-70'
            )}
          />
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* API health */}
          <span
            className="hidden items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground-muted sm:inline-flex"
            title={`${t('dashboardShell.apiStatus')}: ${statusLabel}`}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', statusTone)} aria-hidden="true" />
            <span className="hidden lg:inline">{t('dashboardShell.apiStatus')}</span>
            <span className="rf-sr-only">{statusLabel}</span>
          </span>

          <LanguageToggle />
          <ThemeToggle />

          <button
            type="button"
            disabled
            aria-label={t('dashboardShell.notifications')}
            title={t('common.comingSoon')}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className={cn(
                'flex h-9 items-center gap-2 rounded-lg border border-border bg-surface ps-1 pe-2',
                'transition-colors duration-fast hover:bg-surface-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60'
              )}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md bg-elevated text-2xs font-semibold text-foreground"
                aria-hidden="true"
              >
                {user ? initials(user.name) : '—'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-foreground-subtle" aria-hidden="true" />
            </button>

            <AnimatePresence>
              {profileOpen && user && (
                <motion.div
                  role="menu"
                  initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
                  transition={{ duration: prefersReduced ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute end-0 top-[calc(100%+0.5rem)] z-raised w-64 overflow-hidden rounded-xl border border-border bg-elevated shadow-lg"
                >
                  <div className="border-b border-border px-4 py-3.5">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-foreground-subtle">{user.email}</p>
                    <p className="mt-2 inline-flex rounded-md bg-primary-soft px-2 py-0.5 text-2xs font-medium text-primary">
                      {t(`roles.${user.role}`)}
                    </p>
                  </div>

                  <div className="p-1.5">
                    <MenuLink to="/app/profile" icon={<UserRound className="h-4 w-4" />}>
                      {t('auth.profile.title')}
                    </MenuLink>

                    <span
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground-subtle/70"
                      title={t('common.comingSoon')}
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      {t('dashboardShell.accountSettings')}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
    >
      <span className="shrink-0" aria-hidden="true">
        {icon}
      </span>
      {children}
    </Link>
  );
}
