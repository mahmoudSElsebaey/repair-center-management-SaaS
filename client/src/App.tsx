import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { MainLayout } from '@/layouts/MainLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/routing/ProtectedRoute';
import { SessionBootstrap } from '@/features/auth/SessionBootstrap';
import { Logo } from '@/components/ui/Logo';
import { applyDocumentLanguage } from '@/i18n';
import { useAppSelector } from '@/store/hooks';
import type { Locale } from '@/types/domain';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const TrackPage = lazy(() => import('@/pages/TrackPage'));
const PublicInfoPage = lazy(() => import('@/pages/PublicInfoPage'));

const DashboardPage = lazy(() => import('@/pages/app/DashboardPage'));
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/app/NotificationsPage'));
const ActivityLogPage = lazy(() => import('@/pages/app/ActivityLogPage'));
const CustomersPage = lazy(() => import('@/pages/app/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/pages/app/CustomerDetailPage'));
const DevicesPage = lazy(() => import('@/pages/app/DevicesPage'));
const DeviceDetailPage = lazy(() => import('@/pages/app/DeviceDetailPage'));
const RepairsPage = lazy(() => import('@/pages/app/RepairsPage'));
const RepairDetailPage = lazy(() => import('@/pages/app/RepairDetailPage'));
const StaffPage = lazy(() => import('@/pages/app/StaffPage'));
const TechniciansPage = lazy(() => import('@/pages/app/TechniciansPage'));
const InventoryPage = lazy(() => import('@/pages/app/InventoryPage'));
const InvoicesPage = lazy(() => import('@/pages/app/InvoicesPage'));
const InvoiceDetailPage = lazy(() => import('@/pages/app/InvoiceDetailPage'));
const PaymentsPage = lazy(() => import('@/pages/app/PaymentsPage'));
const AppointmentsPage = lazy(() => import('@/pages/app/AppointmentsPage'));
const ReportsPage = lazy(() => import('@/pages/app/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/app/SettingsPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Logo variant="mark" size="lg" className="animate-pulse opacity-60" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]);

  return null;
}

export default function App() {
  const locale = useAppSelector((state) => state.ui.locale);
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    applyDocumentLanguage(locale as Locale);
  }, [locale, i18n]);

  return (
    <SessionBootstrap>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="track" element={<TrackPage />} />
            <Route path="track/:code" element={<TrackPage />} />
            <Route path="about" element={<PublicInfoPage />} />
            <Route path="contact" element={<PublicInfoPage />} />
            <Route path="docs" element={<PublicInfoPage />} />
            <Route path="status" element={<PublicInfoPage />} />
            <Route path="privacy" element={<PublicInfoPage />} />
            <Route path="terms" element={<PublicInfoPage />} />
          </Route>

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route path="/app" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="devices/:id" element={<DeviceDetailPage />} />

              <Route path="repairs" element={<RepairsPage />} />
              <Route path="repairs/:id" element={<RepairDetailPage />} />

              <Route
                element={
                  <ProtectedRoute
                    roles={[
                      'super_admin',
                      'admin',
                      'manager',
                      'inventory_manager',
                      'technician',
                    ]}
                  />
                }
              >
                <Route path="inventory" element={<InventoryPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    roles={['super_admin', 'admin', 'manager', 'receptionist']}
                  />
                }
              >
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="invoices/:id" element={<InvoiceDetailPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute roles={['super_admin', 'admin', 'manager']} />
                }
              >
                <Route path="technicians" element={<TechniciansPage />} />
                <Route path="activity" element={<ActivityLogPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute roles={['super_admin', 'admin']} />
                }
              >
                <Route path="staff" element={<StaffPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </SessionBootstrap>
  );
}
