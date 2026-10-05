import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Menu,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { findNavItem, searchableNavItems } from '@/config/navigation';
import { authApi } from '@/features/auth/authApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setMobileNav } from '@/store/uiSlice';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn, initials } from '@/lib/utils';

type ApiState = 'checking' | 'online' | 'offline';

export function Topbar() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const user = useAppSelector((state) => state.auth.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const navItem = findNavItem(location.pathname);
  const pageTitle = navItem ? t(navItem.labelKey) : t('dashboard.title');

  const navHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchableNavItems(user?.role)
      .map((item) => ({ item, label: t(item.labelKey) }))
      .filter(({ label, item }) => {
        const hay = `${label} ${item.key} ${item.path}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [query, user?.role, t]);

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
    if (!searchOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchOpen]);

  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  const goTo = (path: string) => {
    setSearchOpen(false);
    setQuery('');
    navigate(path);
  };

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

        <Link to="/" className="lg:hidden" aria-label={t('brand.name')}>
          <Logo variant="mark" size="sm" />
        </Link>

        <div className="hidden min-w-0 flex-col lg:flex">
          <h1 className="truncate text-sm font-semibold text-foreground">{pageTitle}</h1>
          <p className="truncate text-xs text-foreground-subtle">{t('dashboard.subtitle')}</p>
        </div>

        {/* Global search — navigates to matching console sections */}
        <div className="relative mx-auto hidden w-full max-w-md md:block" ref={searchRef}>
          <Search
            className="pointer-events-none absolute inset-y-0 start-0 ms-3 my-auto h-4 w-4 text-foreground-subtle"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && navHits[0]) {
                e.preventDefault();
                goTo(navHits[0].item.path);
              }
            }}
            aria-label={t('common.search')}
            placeholder={t('dashboardShell.searchPlaceholder')}
            className={cn(
              'h-9 w-full rounded-lg border border-border bg-surface-sunken ps-9 pe-3 text-sm',
              'text-foreground placeholder:text-foreground-subtle',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45'
            )}
          />

          <AnimatePresence>
            {searchOpen && query.trim() && (
              <motion.div
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReduced ? 0 : 0.12 }}
                className="absolute inset-x-0 top-[calc(100%+0.35rem)] z-raised overflow-hidden rounded-xl border border-border bg-elevated shadow-lg"
                role="listbox"
              >
                {navHits.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-foreground-subtle">{t('settings.searchEmpty')}</p>
                ) : (
                  <ul className="py-1">
                    {navHits.map(({ item, label }) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            role="option"
                            onClick={() => goTo(item.path)}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm text-foreground-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="flex-1 truncate">{label}</span>
                            <span className="text-2xs text-foreground-subtle" dir="ltr">
                              {item.path}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="ms-auto flex items-center gap-2">
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
          <NotificationBell />

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
                    <MenuLink to="/app/settings" icon={<Settings className="h-4 w-4" />}>
                      {t('nav.settings')}
                    </MenuLink>
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
