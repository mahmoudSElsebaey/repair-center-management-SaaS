import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Barcode,
  ImageOff,
  KeyRound,
  Package,
  Palette,
  Phone,
  Send,
  UserRound,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/feedback/States';
import { PageTransition } from '@/components/motion/primitives';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { DeviceFormDialog } from '@/features/customers/components/DeviceFormDialog';
import { devicesApi } from '@/features/customers/api';
import type { Customer, Device } from '@/features/customers/types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { activeLocale } from '@/lib/i18nText';
import { formatDate, getErrorMessage } from '@/lib/utils';

/**
 * Device detail.
 *
 * The only screen that shows the unlock code. That is deliberate: a technician
 * needs it to test the unit, and nowhere else in the product does.
 */
export default function DeviceDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const locale = activeLocale();

  const [device, setDevice] = useState<Device | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useDocumentTitle(device ? device.displayName : t('devices.title'));

  const load = useCallback(async () => {
    if (!id) return;
    setStatus('loading');
    setError(null);

    try {
      const result = await devicesApi.get(id);
      setDevice(result.device);
      setCustomer(result.customer);
      setStatus('ready');
    } catch (caught) {
      const message = getErrorMessage(caught, t('states.errorBody'));
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

  if (status === 'missing' || !device) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-3xl">
          <EmptyState
            size="lg"
            icon={<Package className="h-6 w-6" />}
            title={t('devices.notFound')}
            description={t('devices.notFoundBody')}
            action={
              <Button variant="outline" onClick={() => navigate('/app/devices')}>
                {t('devices.title')}
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

  const specs = [
    { icon: Barcode, label: t('devices.fields.serial'), value: device.serialNumber, ltr: true },
    { icon: Barcode, label: t('devices.fields.imei'), value: device.imei, ltr: true },
    { icon: Palette, label: t('devices.fields.color'), value: device.color, ltr: false },
  ].filter((row) => Boolean(row.value));

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* ---------------------------------------------------------- header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              to="/app/devices"
              aria-label={t('devices.title')}
              className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            </Link>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold sm:text-3xl">{device.displayName}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="neutral" size="sm">
                  {t(`devices.types.${device.deviceType}`)}
                </Badge>

                <Badge
                  tone={
                    device.condition === 'damaged' || device.condition === 'poor'
                      ? 'danger'
                      : device.condition === 'fair'
                        ? 'warning'
                        : 'success'
                  }
                  size="sm"
                  withDot
                >
                  {t(`devices.conditions.${device.condition}`)}
                </Badge>

                <span className="text-xs text-foreground-subtle">
                  {t('devices.registeredOn')} {formatDate(device.createdAt, locale)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              {t('common.edit')}
            </Button>
            <Button
              leadingIcon={<Wrench className="h-4 w-4" />}
              disabled
              title={t('common.comingSoon')}
            >
              {t('dashboard.quickActions.newRepair')}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            {/* ------------------------------------------------------ issue */}
            <Card>
              <CardHeader title={t('devices.issueSection')} />
              <p className="whitespace-pre-line px-2 text-sm leading-relaxed text-foreground-muted">
                {device.reportedIssue}
              </p>
            </Card>

            {/* ----------------------------------------------------- specs */}
            {specs.length > 0 && (
              <Card>
                <CardHeader title={t('devices.conditionSection')} />

                <dl className="grid gap-3 sm:grid-cols-2">
                  {specs.map(({ icon: Icon, label, value, ltr }) => (
                    <div key={label} className="flex items-start gap-3 rounded-lg px-2 py-2">
                      <Icon
                        className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle"
                        aria-hidden="true"
                      />
                      <dt className="min-w-0 flex-1">
                        <span className="block text-xs text-foreground-subtle">{label}</span>
                        <span
                          className="numeric block truncate text-sm text-foreground"
                          dir={ltr ? 'ltr' : undefined}
                        >
                          {value}
                        </span>
                      </dt>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {/* ----------------------------------------------- accessories */}
            <Card>
              <CardHeader title={t('devices.fields.accessories')} />
              {device.accessories.length === 0 ? (
                <p className="px-2 text-sm text-foreground-subtle">{t('devices.accessoriesNone')}</p>
              ) : (
                <ul className="flex flex-wrap gap-2 px-2">
                  {device.accessories.map((item) => (
                    <li key={item}>
                      <Badge tone="neutral" icon={<Package className="h-3 w-3" />}>
                        {item}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* ----------------------------------------------------- notes */}
            <Card>
              <CardHeader title={t('devices.notesSection')} />
              <p className="px-2 text-sm text-foreground-muted">
                {device.notes || t('devices.noNotes')}
              </p>
            </Card>

            {/* ---------------------------------------------------- images */}
            <Card>
              <CardHeader title={t('devices.images')} />
              {device.images.length === 0 ? (
                <div className="flex items-center gap-3 px-2 text-sm text-foreground-subtle">
                  <ImageOff className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('devices.noImages')}
                </div>
              ) : (
                <ul className="grid grid-cols-2 gap-3 px-2 sm:grid-cols-3">
                  {device.images.map((image) => (
                    <li key={image.url}>
                      <img
                        src={image.url}
                        alt={image.caption ?? device.displayName}
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-border object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ------------------------------------------------------- owner */}
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('devices.ownerSection')} />

              {customer ? (
                <div className="space-y-3 px-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-foreground-subtle"
                      aria-hidden="true"
                    >
                      <UserRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{customer.name}</p>
                      <p className="numeric truncate text-2xs text-foreground-subtle" dir="ltr">
                        {customer.customerCode}
                      </p>
                    </div>
                  </div>

                  <p className="flex items-center gap-2 text-sm text-foreground-muted">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="numeric" dir="ltr">
                      {customer.phone}
                    </span>
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => navigate(`/app/customers/${customer.id}`)}
                  >
                    {t('devices.viewCustomer')}
                  </Button>
                </div>
              ) : (
                <p className="px-2 text-sm text-foreground-subtle">{t('common.notAvailable')}</p>
              )}
            </Card>

            {/* ------------------------------------------- unlock code (sensitive) */}
            <Card>
              <CardHeader
                title={t('devices.unlockCode')}
                description={t('devices.unlockHint')}
              />

              {device.unlockCode ? (
                <p
                  className="numeric mx-2 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-sm font-medium text-foreground"
                  dir="ltr"
                >
                  {device.unlockCode}
                </p>
              ) : (
                <p className="flex items-center gap-2 px-2 text-sm text-foreground-subtle">
                  <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t('common.notAvailable')}
                </p>
              )}
            </Card>

            {/* --------------------------------------------- later phases */}
            <Card>
              <CardHeader title={t('nav.repairs')} />
              <EmptyState
                size="sm"
                icon={<Send className="h-5 w-5" />}
                title={t('dashboard.sections.upcoming')}
                description={t('dashboard.sections.upcomingBody')}
              />
            </Card>
          </div>
        </div>
      </div>

      <DeviceFormDialog
        key={device.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        device={device}
        onSaved={(updated) => setDevice(updated)}
      />
    </PageTransition>
  );
}
