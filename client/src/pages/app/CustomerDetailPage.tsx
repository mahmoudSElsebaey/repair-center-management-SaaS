import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Languages,
  Mail,
  MapPin,
  Phone,
  Plus,
  Smartphone,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog';
import { DeviceFormDialog } from '@/features/customers/components/DeviceFormDialog';
import { customersApi } from '@/features/customers/api';
import type { Customer, Device } from '@/features/customers/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { cn, formatDate, getErrorMessage } from '@/lib/utils';

/**
 * Customer detail.
 *
 * The devices section is the point of this screen: it answers "what has this
 * person brought us, and what did we say about it" in one place, which is the
 * question the counter asks most often.
 */
export default function CustomerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locale = activeLocale();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  useDocumentTitle(customer ? `${customer.name} · ${t('customers.detailTitle')}` : t('customers.title'));

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    setError(null);

    try {
      const result = await customersApi.get(id);
      setCustomer(result.customer);
      setDevices(result.devices);
      setStatus('ready');
    } catch (caught) {
      const message = getErrorMessage(caught, t('states.errorBody'));
      // A 404 is a missing record, not a failure to load — they read differently.
      if (message.toLowerCase().includes('not found')) {
        setStatus('missing');
        return;
      }
      setError(message);
      setStatus('error');
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-5xl">
          <PageSkeleton rows={3} />
        </div>
      </PageTransition>
    );
  }

  if (status === 'missing' || !customer) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            size="lg"
            icon={<Smartphone className="h-6 w-6" />}
            title={t('customers.notFound')}
            description={t('customers.notFoundBody')}
            action={
              <Button variant="outline" onClick={() => navigate('/app/customers')}>
                {t('customers.title')}
              </Button>
            }
          />
        </div>
      </PageTransition>
    );
  }

  if (status === 'error') {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <ErrorState
            title={t('states.errorTitle')}
            description={error ?? t('states.errorBody')}
            onRetry={load}
            retryLabel={t('common.retry')}
          />
        </div>
      </PageTransition>
    );
  }

  const contactRows = [
    { icon: Phone, label: t('customers.phone'), value: customer.phone, ltr: true },
    customer.phoneAlt
      ? { icon: Phone, label: t('customers.secondaryPhone'), value: customer.phoneAlt, ltr: true }
      : null,
    customer.email
      ? { icon: Mail, label: t('customers.email'), value: customer.email, ltr: true }
      : null,
    {
      icon: Languages,
      label: t('customers.preferredLanguage'),
      value: customer.preferredLanguage === 'ar' ? t('language.arabic') : t('language.english'),
      ltr: false,
    },
    {
      icon: CalendarDays,
      label: t('customers.customerSince'),
      value: formatDate(customer.createdAt, locale),
      ltr: false,
    },
  ].filter(Boolean) as Array<{ icon: typeof Phone; label: string; value: string; ltr: boolean }>;

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* ---------------------------------------------------------- header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              to="/app/customers"
              aria-label={t('customers.title')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{customer.name}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="numeric rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-xs text-foreground-muted" dir="ltr">
                  {customer.customerCode}
                </span>

                <Badge tone={customer.isActive ? 'success' : 'neutral'} withDot size="sm">
                  {customer.isActive ? t('customers.active') : t('customers.archived')}
                </Badge>

                <span className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle">
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="numeric">{devices.length}</span> {t('customers.devices')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              {t('common.edit')}
            </Button>
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              onClick={() => setDeviceOpen(true)}
            >
              {t('customers.addDevice')}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* ------------------------------------------------------- contact */}
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('customers.contactSection')} />

              <dl className="space-y-1">
                {contactRows.map(({ icon: Icon, label, value, ltr }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    <dt className="min-w-0 flex-1">
                      <span className="block text-xs text-foreground-subtle">{label}</span>
                      <span className="block truncate text-sm text-foreground" dir={ltr ? 'ltr' : undefined}>
                        {value}
                      </span>
                    </dt>
                  </div>
                ))}
              </dl>
            </Card>

            {(customer.address || customer.city) && (
              <Card>
                <CardHeader title={t('customers.addressSection')} />
                <div className="flex items-start gap-3 px-2 text-sm text-foreground-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                  <p>
                    {customer.address}
                    {customer.address && customer.city && <br />}
                    {customer.city}
                  </p>
                </div>
              </Card>
            )}

            <Card>
              <CardHeader title={t('customers.notesSection')} />
              <p className={cn('px-2 text-sm', customer.notes ? 'text-foreground-muted' : 'text-foreground-subtle')}>
                {customer.notes || t('customers.noNotes')}
              </p>
            </Card>

            <Card>
              <CardHeader title={t('auth.profile.branch')} />
              <div className="flex items-center gap-3 px-2 text-sm text-foreground-muted">
                <Building2 className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                <span className="numeric">{customer.branch}</span>
              </div>
            </Card>
          </div>

          {/* ------------------------------------------------------- devices */}
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-border p-5">
              <CardHeader
                className="mb-0"
                title={t('customers.devicesSection')}
                description={t('devices.subtitle')}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    leadingIcon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => setDeviceOpen(true)}
                  >
                    {t('customers.addDevice')}
                  </Button>
                }
              />
            </div>

            {devices.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  size="sm"
                  icon={<Smartphone className="h-5 w-5" />}
                  title={t('customers.noDevices')}
                  description={t('customers.noDevicesBody')}
                  action={
                    <Button size="sm" onClick={() => setDeviceOpen(true)}>
                      {t('customers.addDevice')}
                    </Button>
                  }
                />
              </div>
            ) : (
              <ul>
                {devices.map((device, index) => (
                  <li key={device.id}>
                    <Link
                      to={`/app/devices/${device.id}`}
                      className={cn(
                        'flex items-center gap-4 px-5 py-4 transition-colors duration-fast hover:bg-surface-hover',
                        index < devices.length - 1 && 'border-b border-border-soft'
                      )}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-foreground-subtle"
                        aria-hidden="true"
                      >
                        <Smartphone className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {device.displayName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-foreground-subtle">
                          {t(`devices.types.${device.deviceType}`)} ·{' '}
                          {t(`devices.conditions.${device.condition}`)}
                        </span>
                      </span>

                      <Badge tone="neutral" size="sm">
                        {formatDate(device.createdAt, locale)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <CustomerFormDialog
        key={customer.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        customer={customer}
        onSaved={(updated) => setCustomer(updated)}
      />

      <DeviceFormDialog
        open={deviceOpen}
        onClose={() => setDeviceOpen(false)}
        customerId={customer.id}
        onSaved={() => void load()}
      />
    </PageTransition>
  );
}
