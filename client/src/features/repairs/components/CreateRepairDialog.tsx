import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Search, Wrench } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, Textarea } from '@/components/forms/Fields';
import { useToast } from '@/components/feedback/Toast';
import { createRepairFormSchema, optionalNumber, type CreateRepairFormValues } from '../schemas';
import { repairsApi } from '../api';
import { devicesApi } from '@/features/customers/api';
import type { Device } from '@/features/customers/types';
import type { RepairTicket } from '../types';
import { ApiError } from '@/lib/apiClient';
import { cn, getErrorMessage } from '@/lib/utils';
import { PRIORITY_VALUES } from '../schemas';

/**
 * Open a new repair ticket.
 *
 * The device is chosen through a searchable picker rather than a dropdown: a
 * workshop accumulates devices indefinitely, and a select would eventually hold
 * thousands of entries.
 *
 * A device with no open ticket is the only sensible choice, so the picker shows
 * the owner alongside the unit — at the counter, "which Ahmed?" is the real
 * question being answered.
 */
export function CreateRepairDialog({
  open,
  onClose,
  onCreated,
  deviceId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (ticket: RepairTicket) => void;
  /** Pre-selects the device when opened from a device page. */
  deviceId?: string;
}) {
  const { t } = useTranslation();
  const notify = useToast();

  const [serverError, setServerError] = useState<string | null>(null);
  const [deviceQuery, setDeviceQuery] = useState('');
  const [deviceResults, setDeviceResults] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateRepairFormValues>({
    resolver: zodResolver(createRepairFormSchema),
    defaultValues: {
      device: deviceId ?? '',
      priority: 'normal',
      issue: '',
      technician: '',
      estimatedCost: '',
      warrantyDays: 90,
      expectedCompletionAt: '',
      notes: '',
    },
    mode: 'onBlur',
  });

  // Resolve the pre-selected device so its summary can be shown.
  useEffect(() => {
    if (!open || !deviceId) return;

    void devicesApi
      .get(deviceId)
      .then(({ device }) => setSelectedDevice(device))
      .catch(() => setSelectedDevice(null));
  }, [open, deviceId]);

  // Device search, debounced.
  useEffect(() => {
    if (!open) return;

    const term = deviceQuery.trim();
    if (term.length < 2) {
      setDeviceResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void devicesApi
        .list({ search: term, limit: 8 })
        .then(({ items }) => {
          if (!cancelled) setDeviceResults(items);
        })
        .catch(() => {
          if (!cancelled) setDeviceResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deviceQuery, open]);

  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  const chooseDevice = (device: Device) => {
    setSelectedDevice(device);
    setValue('device', device.id, { shouldValidate: true });
    // Seeding the issue from intake saves the counter from retyping what the
    // customer already said when the device was registered.
    setValue('issue', device.reportedIssue, { shouldValidate: false });
    setDeviceQuery('');
    setDeviceResults([]);
  };

  const onSubmit = async (values: CreateRepairFormValues) => {
    setServerError(null);

    try {
      const result = await repairsApi.create({
        device: values.device,
        priority: values.priority,
        issue: values.issue?.trim() || undefined,
        technician: values.technician || undefined,
        estimatedCost: optionalNumber(values.estimatedCost),
        warrantyDays: values.warrantyDays,
        expectedCompletionAt: values.expectedCompletionAt || undefined,
        notes: values.notes?.trim() || undefined,
      });

      notify.success(
        t('repairs.createdToast'),
        t('repairs.createdToastBody', {
          code: result.ticket.code,
          device: selectedDevice?.displayName ?? '',
        })
      );

      onCreated?.(result.ticket);
      onClose();
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : getErrorMessage(error, t('states.errorBody'))
      );
    }
  };

  const priorityOptions = PRIORITY_VALUES.map((priority) => ({
    value: priority,
    label: t(`repairs.priority.${priority}`),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('repairs.add')}
      description={t('repairs.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="repair-form"
            isLoading={isSubmitting}
            leadingIcon={<Wrench className="h-4 w-4" />}
          >
            {t('repairs.add')}
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

      <form id="repair-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* ------------------------------------------------------- device */}
        <div>
          <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
            {t('repairs.fields.device')}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          </span>

          {selectedDevice ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {selectedDevice.displayName}
                </p>
                <p className="truncate text-2xs text-foreground-subtle">
                  {selectedDevice.customerName ?? ''}
                  {selectedDevice.serialNumber && ` · ${selectedDevice.serialNumber}`}
                </p>
              </div>

              {!deviceId && (
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedDevice(null);
                    setValue('device', '', { shouldValidate: false });
                  }}
                >
                  {t('common.clear')}
                </Button>
              )}
            </div>
          ) : (
            <>
              <Input
                placeholder={t('repairs.fields.devicePlaceholder')}
                value={deviceQuery}
                onChange={(event) => setDeviceQuery(event.target.value)}
                leadingIcon={<Search className="h-4 w-4" />}
                error={fieldError(errors.device?.message)}
              />

              {isSearching && (
                <p className="mt-1.5 text-xs text-foreground-subtle">{t('common.loading')}</p>
              )}

              {deviceResults.length > 0 && (
                <ul className="mt-1.5 max-h-52 overflow-y-auto rounded-lg border border-border bg-elevated p-1 shadow-md">
                  {deviceResults.map((device) => (
                    <li key={device.id}>
                      <button
                        type="button"
                        onClick={() => chooseDevice(device)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-start',
                          'transition-colors duration-fast hover:bg-surface-hover'
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {device.displayName}
                          </span>
                          <span className="block truncate text-2xs text-foreground-subtle">
                            {device.customerName ?? '—'}
                            {device.serialNumber && ` · ${device.serialNumber}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <input type="hidden" {...register('device')} />
        </div>

        {/* ----------------------------------------------------- priority */}
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Select
              label={t('repairs.fields.priority')}
              options={priorityOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />

        <Textarea
          label={t('repairs.fields.issue')}
          placeholder={t('repairs.fields.issuePlaceholder')}
          rows={3}
          hint={t('common.optional')}
          error={fieldError(errors.issue?.message)}
          {...register('issue')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`${t('repairs.fields.estimatedCost')} (${t('common.optional')})`}
            type="number"
            min={0}
            step="0.01"
            dir="ltr"
            error={fieldError(errors.estimatedCost?.message)}
            {...register('estimatedCost')}
          />

          <Input
            label={t('repairs.fields.warrantyDays')}
            type="number"
            min={0}
            max={3650}
            dir="ltr"
            error={fieldError(errors.warrantyDays?.message)}
            {...register('warrantyDays')}
          />
        </div>

        <Input
          label={`${t('repairs.expectedCompletion')} (${t('common.optional')})`}
          type="date"
          dir="ltr"
          error={fieldError(errors.expectedCompletionAt?.message)}
          {...register('expectedCompletionAt')}
        />

        <Textarea
          label={`${t('repairs.fields.notes')} (${t('common.optional')})`}
          rows={2}
          error={fieldError(errors.notes?.message)}
          {...register('notes')}
        />
      </form>
    </Modal>
  );
}
