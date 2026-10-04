import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Search } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/forms/Fields';
import { useToast } from '@/components/feedback/Toast';
import { deviceFormSchema, parseAccessories, type DeviceFormValues } from '../schemas';
import { customersApi, devicesApi } from '../api';
import { ApiError } from '@/lib/apiClient';
import { cn, getErrorMessage } from '@/lib/utils';
import { DEVICE_TYPES } from '@/types/domain';
import type { Customer, Device } from '../types';

/**
 * Register or edit a device.
 *
 * The owner field is a searchable picker backed by the API rather than a
 * preloaded dropdown: a repair chain accumulates customers indefinitely, and
 * loading them all into a `<select>` would degrade as the business grows.
 */
export function DeviceFormDialog({
  open,
  onClose,
  onSaved,
  device,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (device: Device) => void;
  device?: Device | null;
  /** Pre-selects the owner and locks the picker when opened from a customer. */
  customerId?: string;
}) {
  const { t } = useTranslation();
  const notify = useToast();

  const isEditing = Boolean(device);
  const lockOwner = Boolean(customerId) && !device;

  const [serverError, setServerError] = useState<string | null>(null);
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerResults, setOwnerResults] = useState<Customer[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<Customer | null>(null);
  const [isSearchingOwners, setIsSearchingOwners] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
    defaultValues: {
      customer: device?.customer ?? customerId ?? '',
      deviceType: device?.deviceType ?? 'smartphone',
      brand: device?.brand ?? '',
      model: device?.model ?? '',
      serialNumber: device?.serialNumber ?? '',
      imei: device?.imei ?? '',
      color: device?.color ?? '',
      condition: device?.condition ?? 'good',
      accessoriesText: device?.accessories?.join(', ') ?? '',
      reportedIssue: device?.reportedIssue ?? '',
      unlockCode: device?.unlockCode ?? '',
      notes: device?.notes ?? '',
    },
    mode: 'onBlur',
  });

  // When the dialog opens with a fixed owner, resolve their name for display.
  useEffect(() => {
    if (!open || !customerId) return;

    void customersApi
      .get(customerId)
      .then(({ customer }) => setSelectedOwner(customer))
      .catch(() => setSelectedOwner(null));
  }, [open, customerId]);

  // Owner search, debounced and cancelled on unmount.
  useEffect(() => {
    if (!open || lockOwner) return;

    const term = ownerQuery.trim();
    if (term.length < 2) {
      setOwnerResults([]);
      return;
    }

    let cancelled = false;
    setIsSearchingOwners(true);

    const timer = window.setTimeout(() => {
      void customersApi
        .list({ search: term, limit: 6 })
        .then(({ items }) => {
          if (!cancelled) setOwnerResults(items);
        })
        .catch(() => {
          if (!cancelled) setOwnerResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingOwners(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ownerQuery, open, lockOwner]);

  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  const chooseOwner = (customer: Customer) => {
    setSelectedOwner(customer);
    setValue('customer', customer.id, { shouldValidate: true });
    setOwnerQuery('');
    setOwnerResults([]);
  };

  const onSubmit = async (values: DeviceFormValues) => {
    setServerError(null);

    const payload = {
      customer: values.customer,
      deviceType: values.deviceType,
      brand: values.brand.trim(),
      model: values.model.trim(),
      serialNumber: values.serialNumber || undefined,
      imei: values.imei || undefined,
      color: values.color || undefined,
      condition: values.condition,
      accessories: parseAccessories(values.accessoriesText),
      reportedIssue: values.reportedIssue.trim(),
      unlockCode: values.unlockCode || undefined,
      notes: values.notes || undefined,
    };

    try {
      const result = device
        ? await devicesApi.update(device.id, payload)
        : await devicesApi.create(payload);

      notify.success(
        isEditing ? t('devices.updated') : t('devices.created'),
        isEditing
          ? result.device.displayName
          : t('devices.createdBody', {
              name: result.device.displayName,
              customer: selectedOwner?.name ?? '',
            })
      );

      onSaved?.(result.device);
      onClose();
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : getErrorMessage(error, t('states.errorBody'))
      );
    }
  };

  const deviceTypeOptions = DEVICE_TYPES.map((type) => ({
    value: type,
    label: t(`devices.types.${type}`),
  }));

  const conditionOptions = (['excellent', 'good', 'fair', 'poor', 'damaged'] as const).map(
    (condition) => ({ value: condition, label: t(`devices.conditions.${condition}`) })
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? t('devices.edit') : t('devices.add')}
      description={t('devices.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="device-form" isLoading={isSubmitting}>
            {isEditing ? t('common.save') : t('devices.add')}
          </Button>
        </>
      }
    >
      {serverError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{serverError}</p>
        </div>
      )}

      <form id="device-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* ------------------------------------------------------------ owner */}
        <div>
          <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
            {t('devices.fields.customer')}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </span>

          {selectedOwner ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedOwner.name}
                </p>
                <p className="numeric truncate text-2xs text-foreground-subtle" dir="ltr">
                  {selectedOwner.customerCode} · {selectedOwner.phone}
                </p>
              </div>

              {!lockOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedOwner(null);
                    setValue('customer', '', { shouldValidate: false });
                  }}
                >
                  {t('common.clear')}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Input
                placeholder={t('devices.fields.customerPlaceholder')}
                value={ownerQuery}
                onChange={(event) => setOwnerQuery(event.target.value)}
                leadingIcon={<Search className="h-4 w-4" />}
                error={fieldError(errors.customer?.message)}
              />

              {isSearchingOwners && (
                <p className="mt-1.5 text-xs text-foreground-subtle">{t('common.loading')}</p>
              )}

              {ownerResults.length > 0 && (
                <ul className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border bg-elevated p-1 shadow-md">
                  {ownerResults.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => chooseOwner(customer)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start',
                          'transition-colors duration-fast hover:bg-surface-hover'
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {customer.name}
                          </span>
                          <span
                            className="numeric block truncate text-2xs text-foreground-subtle"
                            dir="ltr"
                          >
                            {customer.customerCode} · {customer.phone}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* Keeps the field registered even while the picker is custom UI. */}
          <input type="hidden" {...register('customer')} />
        </div>

        {/* -------------------------------------------------------- identity */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="deviceType"
            render={({ field }) => (
              <Select
                label={t('devices.fields.deviceType')}
                options={deviceTypeOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                required
              />
            )}
          />

          <Controller
            control={control}
            name="condition"
            render={({ field }) => (
              <Select
                label={t('devices.fields.condition')}
                options={conditionOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
              />
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('devices.fields.brand')}
            placeholder={t('devices.fields.brandPlaceholder')}
            error={fieldError(errors.brand?.message)}
            required
            {...register('brand')}
          />

          <Input
            label={t('devices.fields.model')}
            placeholder={t('devices.fields.modelPlaceholder')}
            error={fieldError(errors.model?.message)}
            required
            {...register('model')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label={`${t('devices.fields.serial')} (${t('common.optional')})`}
            dir="ltr"
            error={fieldError(errors.serialNumber?.message)}
            {...register('serialNumber')}
          />

          <Input
            label={`${t('devices.fields.imei')} (${t('common.optional')})`}
            dir="ltr"
            error={fieldError(errors.imei?.message)}
            {...register('imei')}
          />

          <Input
            label={`${t('devices.fields.color')} (${t('common.optional')})`}
            error={fieldError(errors.color?.message)}
            {...register('color')}
          />
        </div>

        <Input
          label={`${t('devices.fields.accessories')} (${t('common.optional')})`}
          placeholder={t('devices.fields.accessoriesPlaceholder')}
          hint={t('devices.fields.accessoriesHint')}
          error={fieldError(errors.accessoriesText?.message)}
          {...register('accessoriesText')}
        />

        <Textarea
          label={t('devices.fields.reportedIssue')}
          placeholder={t('devices.fields.reportedIssuePlaceholder')}
          rows={3}
          error={fieldError(errors.reportedIssue?.message)}
          required
          {...register('reportedIssue')}
        />

        <Input
          label={`${t('devices.fields.unlockCode')} (${t('common.optional')})`}
          hint={t('devices.fields.unlockCodeHint')}
          dir="ltr"
          error={fieldError(errors.unlockCode?.message)}
          {...register('unlockCode')}
        />

        <Textarea
          label={`${t('devices.fields.notes')} (${t('common.optional')})`}
          rows={2}
          error={fieldError(errors.notes?.message)}
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
