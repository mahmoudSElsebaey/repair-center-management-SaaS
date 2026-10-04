import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { MainLayout } from '@/layouts/MainLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/routing/ProtectedRoute';
import { SessionBootstrap } from '@/features/auth/SessionBootstrap';
import { Logo } from '@/components/ui/Logo';
import { applyDocumentLanguage } from '@/i18n';
import { useAppSelector } from '@/store/hooks';
import type { Locale } from '@/types/domain';

/* -------------------------------------------------------------------------- */
/* Route-level code splitting                                                  */
/* -------------------------------------------------------------------------- */

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));
const ActivityLogPage = lazy(() => import('@/pages/app/ActivityLogPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Logo variant="mark" size="lg" className="animate-pulse opacity-60" />
    </div>
  );
}

export default function App() {
  const locale = useAppSelector((state) => state.ui.locale);
  const { i18n } = useTranslation();

  /**
   * Keep the document in step with the stored preference.
   *
   * This covers the first paint after a reload (where the inline script in
   * index.html and the persisted token already agree) as well as a locale that
   * arrives from the server with the user profile.
   */
  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    applyDocumentLanguage(locale as Locale);
  }, [locale, i18n]);

  return (
    <SessionBootstrap>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ---------------- Public site ---------------- */}
          <Route element={<MainLayout />}>
            <Route index element={<LandingPage />} />
          </Route>

          {/* ---------------- Authentication ---------------- */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* ---------------- Operations console ---------------- */}
          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Every staff role: the API scopes notifications to the recipient. */}
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Management roles only — matches the server-side guard. */}
              <Route
                element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'manager']} />
                }
              >
                <Route path="activity" element={<ActivityLogPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </SessionBootstrap>
  );
}
