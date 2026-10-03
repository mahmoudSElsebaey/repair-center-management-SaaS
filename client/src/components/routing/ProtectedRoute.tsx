import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types/domain';

/**
 * Route guard for the operations console.
 *
 * Two separate concerns, deliberately:
 *   1. not signed in            → redirect to /login, remembering where we were
 *   2. signed in, wrong role    → render an honest access-denied screen
 *
 * Redirecting a signed-in user to /login when they lack a role is a classic
 * bug: it looks like the app logged them out.
 */
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const location = useLocation();

  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const user = useAppSelector((state) => state.auth.user);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const roleAllowed = !roles || roles.length === 0 || roles.includes(user.role);

  if (!roleAllowed) {
    return <AccessDenied />;
  }

  return <Outlet />;
}

/** Standalone screen so it can also be used for a dedicated /app/denied route. */
export function AccessDenied() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="rf-panel w-full max-w-md p-7 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-warning/30 bg-warning-soft text-warning">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <h1 className="text-lg font-semibold text-foreground">
          {t('auth.accessDenied.title')}
        </h1>

        <p className="mt-2 text-sm text-foreground-muted">{t('auth.accessDenied.body')}</p>

        <Button
          className="mt-6"
          onClick={() => {
            window.location.assign('/app');
          }}
        >
          {t('auth.accessDenied.backToDashboard')}
        </Button>
      </div>
    </div>
  );
}

/**
 * Inverse guard for public-only screens (login, forgot password).
 * A signed-in user visiting /login is sent straight to the console.
 */
export function PublicOnlyRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  return isAuthenticated ? <Navigate to="/app" replace /> : <Outlet />;
}
