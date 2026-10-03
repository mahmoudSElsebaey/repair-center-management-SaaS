import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Logo } from '@/components/ui/Logo';
import { SkipLink } from '@/components/a11y/SkipLink';
import { ToastViewport } from '@/components/feedback/Toast';
import { useAppDispatch } from '@/store/hooks';
import { setMobileNav } from '@/store/uiSlice';

/**
 * Authenticated application shell.
 *
 * Desktop: persistent sidebar + topbar + scrolling content region.
 * Mobile:  topbar with a drawer, and content that owns the full width.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const location = useLocation();

  // A route change on mobile should never leave the drawer covering the page.
  useEffect(() => {
    dispatch(setMobileNav(false));
  }, [location.pathname, dispatch]);

  // Move focus to the content region on navigation for screen-reader users.
  useEffect(() => {
    document.getElementById('app-content')?.focus();
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh bg-background">
      <SkipLink label={t('a11y.skipToContent', { defaultValue: 'Skip to content' })} />

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main
          id="app-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-5 focus:outline-none sm:px-6 sm:py-6"
        >
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Logo variant="mark" size="lg" className="animate-pulse opacity-70" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ToastViewport closeLabel={t('common.close')} />
    </div>
  );
}
