import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, UserPlus } from 'lucide-react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/feedback/Toast';
import { customerFormSchema, type CustomerFormValues } from '../schemas';
import { customersApi } from '../api';
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/utils';
import type { Customer } from '../types';

/**
 * Register or edit a customer.
 *
 * One component for both, because the fields and validation are identical and
 * maintaining two would guarantee eventual drift. `customer` switches it to edit
 * mode.
 */
export function CustomerFormDialog({
  open,
  onClose,
  onSaved,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
  customer?: Customer | null;
}) {
  const { t } = useTranslation();
  const notify = useToast();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      phoneAlt: customer?.phoneAlt ?? '',
      email: customer?.email ?? '',
      city: customer?.city ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      preferredLanguage: customer?.preferredLanguage ?? 'ar',
    },
    mode: 'onBlur',
  });

  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  const onSubmit = async (values: CustomerFormValues) => {
    setServerError(null);

    const payload = {
      ...values,
      phoneAlt: values.phoneAlt || undefined,
      email: values.email || undefined,
      city: values.city || undefined,
      address: values.address || undefined,
      notes: values.notes || undefined,
    };

    try {
      const result = customer
        ? await customersApi.update(customer.id, payload)
        : await customersApi.create(payload);

      notify.success(
        isEditing ? t('customers.updated') : t('customers.created'),
        isEditing
          ? result.customer.name
          : t('customers.createdBody', {
              name: result.customer.name,
              code: result.customer.customerCode,
            })
      );

      reset();
      onSaved?.(result.customer);
      onClose();

      // A freshly registered customer is almost always followed by a device.
      if (!isEditing) navigate(`/app/customers/${result.customer.id}`);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : getErrorMessage(error, t('states.errorBody'))
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? t('customers.edit') : t('customers.add')}
      description={t('customers.subtitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="customer-form"
            isLoading={isSubmitting}
            leadingIcon={<UserPlus className="h-4 w-4" />}
          >
            {isEditing ? t('common.save') : t('customers.add')}
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

      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label={t('customers.fields.name')}
          placeholder={t('customers.fields.namePlaceholder')}
          error={fieldError(errors.name?.message)}
          required
          {...register('name')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('customers.fields.phone')}
            type="tel"
            dir="ltr"
            placeholder={t('customers.fields.phonePlaceholder')}
            error={fieldError(errors.phone?.message)}
            required
            {...register('phone')}
          />

          <Input
            label={`${t('customers.fields.phoneAlt')} (${t('common.optional')})`}
            type="tel"
            dir="ltr"
            error={fieldError(errors.phoneAlt?.message)}
            {...register('phoneAlt')}
          />
        </div>

        <Input
          label={`${t('customers.fields.email')} (${t('common.optional')})`}
          type="email"
          dir="ltr"
          error={fieldError(errors.email?.message)}
          {...register('email')}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Input
            label={t('customers.fields.city')}
            error={fieldError(errors.city?.message)}
            {...register('city')}
          />

          <Input
            label={t('customers.fields.address')}
            placeholder={t('customers.fields.addressPlaceholder')}
            error={fieldError(errors.address?.message)}
            {...register('address')}
          />
        </div>

        <div>
          <label
            htmlFor="customer-language"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            {t('customers.preferredLanguage')}
          </label>
          <select
            id="customer-language"
            className="h-11 w-full rounded-lg border border-border bg-surface-sunken px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45"
            {...register('preferredLanguage')}
          >
            <option value="ar">{t('language.arabic')}</option>
            <option value="en">{t('language.english')}</option>
          </select>
        </div>

        <div>
          <label htmlFor="customer-notes" className="mb-1.5 block text-sm font-medium text-foreground">
            {t('customers.fields.notes')}
          </label>
          <textarea
            id="customer-notes"
            rows={3}
            placeholder={t('customers.fields.notesPlaceholder')}
            className="w-full rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45"
            {...register('notes')}
          />
        </div>
      </form>
    </Modal>
  );
}
