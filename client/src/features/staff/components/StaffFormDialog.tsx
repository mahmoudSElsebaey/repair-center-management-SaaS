import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/forms/Fields';
import { useToast } from '@/components/feedback/Toast';
import { staffApi } from '../api';
import {
  createStaffFormSchema,
  updateStaffFormSchema,
  type CreateStaffFormValues,
  type UpdateStaffFormValues,
} from '../schemas';
import type { StaffBranch, StaffMember } from '../types';
import { USER_ROLES, type UserRole } from '@/types/domain';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';

const ASSIGNABLE = USER_ROLES.filter((r) => r !== 'super_admin') as UserRole[];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (member: StaffMember) => void;
  member?: StaffMember | null;
  branches: StaffBranch[];
}

export function StaffFormDialog({ open, onClose, onSaved, member, branches }: Props) {
  const { t } = useTranslation();
  const notify = useToast();
  const actor = useAppSelector((s) => s.auth.user);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(member);

  const roles = ASSIGNABLE.filter((role) => {
    if (role === 'admin' && actor?.role !== 'super_admin') return false;
    return true;
  });

  const form = useForm<CreateStaffFormValues & UpdateStaffFormValues>({
    resolver: zodResolver(isEdit ? updateStaffFormSchema : createStaffFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'technician',
      branch: '',
      locale: 'ar',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (member) {
      form.reset({
        name: member.name,
        email: member.email,
        phone: member.phone ?? '',
        password: '',
        role: member.role === 'super_admin' ? 'admin' : member.role,
        branch: member.branch?.id ?? '',
        locale: member.locale,
        isActive: member.isActive,
      });
    } else {
      form.reset({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'technician',
        branch: '',
        locale: 'ar',
        isActive: true,
      });
    }
  }, [open, member, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      if (isEdit && member) {
        const result = await staffApi.update(member.id, {
          name: values.name,
          phone: values.phone || null,
          role: values.role as UserRole,
          branch: values.branch || null,
          locale: values.locale as 'ar' | 'en' | undefined,
          isActive: values.isActive,
          password: values.password ? values.password : undefined,
        });
        notify.success(t('staff.updatedToast'));
        onSaved(result.member);
      } else {
        const result = await staffApi.create({
          name: values.name,
          email: values.email!,
          phone: values.phone || undefined,
          password: values.password!,
          role: values.role as UserRole,
          branch: values.branch || null,
          locale: values.locale as 'ar' | 'en' | undefined,
        });
        notify.success(t('staff.createdToast'));
        onSaved(result.member);
      }
      onClose();
    } catch (caught) {
      notify.error(t('states.errorTitle'), getErrorMessage(caught, t('states.errorBody')));
    } finally {
      setSubmitting(false);
    }
  });

  const fieldError = (key?: string) => (key ? t(key) : undefined);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? t('staff.edit') : t('staff.add')}
      description={t('staff.formHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} isLoading={submitting}>
            {isEdit ? t('common.save') : t('staff.add')}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          label={t('staff.fields.name')}
          error={fieldError(form.formState.errors.name?.message)}
          {...form.register('name')}
        />

        {!isEdit && (
          <Input
            label={t('staff.fields.email')}
            type="email"
            dir="ltr"
            error={fieldError(form.formState.errors.email?.message)}
            {...form.register('email')}
          />
        )}

        <Input
          label={t('staff.fields.phone')}
          dir="ltr"
          error={fieldError(form.formState.errors.phone?.message)}
          {...form.register('phone')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('staff.fields.role')}
            error={fieldError(form.formState.errors.role?.message)}
            options={roles.map((role) => ({
              value: role,
              label: t(`roles.${role}`),
            }))}
            {...form.register('role')}
          />

          <Select
            label={t('staff.fields.branch')}
            options={[
              { value: '', label: t('staff.fields.branchNone') },
              ...branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })),
            ]}
            {...form.register('branch')}
          />
        </div>

        <Input
          label={isEdit ? t('staff.fields.newPassword') : t('staff.fields.password')}
          type="password"
          dir="ltr"
          error={fieldError(form.formState.errors.password?.message)}
          {...form.register('password')}
        />

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input type="checkbox" className="rounded border-border" {...form.register('isActive')} />
            {t('staff.fields.active')}
          </label>
        )}
      </form>
    </Modal>
  );
}
