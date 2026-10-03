import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/motion/primitives';
import { useToast } from '@/components/feedback/Toast';
import { authApi } from '@/features/auth/authApi';
import { setUser } from '@/features/auth/authSlice';
import {
  changePasswordFormSchema,
  profileFormSchema,
  type ChangePasswordFormValues,
  type ProfileFormValues,
} from '@/features/auth/schemas';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/lib/apiClient';
import { formatDate, getErrorMessage, initials } from '@/lib/utils';
import type { Locale } from '@/types/domain';

/**
 * Profile screen.
 *
 * Three real, server-backed sections: account details (`PATCH /auth/me`),
 * interface preferences (locale is persisted to the user record), and password
 * change (`PATCH /auth/password`). Email is intentionally read-only — changing
 * the identity of an account is an administrative action, not a self-service one.
 */
export default function ProfilePage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const notify = useToast();
  const { setLocale } = useLanguage();

  useDocumentTitle(t('auth.profile.title'));

  const user = useAppSelector((state) => state.auth.user);
  const locale = useAppSelector((state) => state.ui.locale);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      locale: (user?.locale ?? locale) as Locale,
    },
    mode: 'onBlur',
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  // Keep the form aligned if the profile arrives after the first render.
  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name,
      phone: user.phone ?? '',
      locale: user.locale,
    });
  }, [user, profileForm]);

  if (!user) return null;

  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  /* ---------------- Profile ---------------- */
  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileError(null);

    try {
      const { user: updated } = await authApi.updateProfile({
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        locale: values.locale,
      });

      dispatch(setUser(updated));

      if (values.locale !== locale) setLocale(values.locale);

      notify.success(t('auth.profile.saved'));
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : getErrorMessage(error, t('auth.profile.saveError'));
      setProfileError(message);
    }
  };

  /* ---------------- Password ---------------- */
  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setPasswordError(null);

    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      passwordForm.reset();
      notify.success(t('auth.profile.passwordSaved'));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : getErrorMessage(error, t('auth.profile.passwordError'));
      setPasswordError(message);
    }
  };

  const details = [
    { icon: Mail, label: t('auth.profile.email'), value: user.email, ltr: true },
    { icon: Phone, label: t('auth.profile.phone'), value: user.phone || '—', ltr: true },
    {
      icon: Building2,
      label: t('auth.profile.branch'),
      value: user.branch ? user.branch : t('auth.profile.allBranches'),
      ltr: false,
    },
    {
      icon: CalendarDays,
      label: t('auth.profile.memberSince'),
      value: formatDate(user.createdAt, locale),
      ltr: false,
    },
    {
      icon: Clock,
      label: t('auth.profile.lastLogin'),
      value: user.lastLogin ? formatDate(user.lastLogin, locale, { hour: '2-digit', minute: '2-digit' }) : '—',
      ltr: false,
    },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ---------- Identity header ---------- */}
        <Card variant="raised" padding="lg">
          <div className="flex flex-wrap items-center gap-5">
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-xl font-bold text-foreground"
              aria-hidden="true"
            >
              {initials(user.name)}
            </span>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold sm:text-2xl">{user.name}</h1>
              <p className="numeric mt-1 truncate text-sm text-foreground-muted" dir="ltr">
                {user.email}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="primary" icon={<ShieldCheck className="h-3 w-3" />}>
                  {t(`roles.${user.role}`)}
                </Badge>

                <Badge tone={user.isActive ? 'success' : 'danger'} withDot>
                  {user.isActive ? t('common.yes') : t('common.no')}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* ---------- Account details ---------- */}
          <Card>
            <CardHeader
              title={t('auth.profile.accountSection')}
              description={t('auth.profile.subtitle')}
            />

            <dl className="space-y-1">
              {details.map(({ icon: Icon, label, value, ltr }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-foreground-subtle"
                    aria-hidden="true"
                  />
                  <dt className="min-w-0 flex-1">
                    <span className="block text-xs text-foreground-subtle">{label}</span>
                    <span
                      className="block truncate text-sm text-foreground"
                      dir={ltr ? 'ltr' : undefined}
                    >
                      {value}
                    </span>
                  </dt>
                </div>
              ))}
            </dl>

            <p className="mt-4 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-xs text-foreground-subtle">
              {t('auth.profile.emailImmutable')}
            </p>
          </Card>

          {/* ---------- Preferences + password ---------- */}
          <div className="space-y-5">
            <Card>
              <CardHeader title={t('auth.profile.preferencesSection')} />

              {profileError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  <p className="text-sm text-danger">{profileError}</p>
                </div>
              )}

              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                noValidate
                className="space-y-4"
              >
                <Input
                  label={t('auth.profile.name')}
                  leadingIcon={<UserRound className="h-4 w-4" />}
                  error={fieldError(profileForm.formState.errors.name?.message)}
                  required
                  {...profileForm.register('name')}
                />

                <Input
                  label={t('auth.profile.phone')}
                  type="tel"
                  dir="ltr"
                  leadingIcon={<Phone className="h-4 w-4" />}
                  error={fieldError(profileForm.formState.errors.phone?.message)}
                  {...profileForm.register('phone')}
                />

                <div>
                  <label
                    htmlFor="profile-locale"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    {t('auth.profile.language')}
                  </label>
                  <select
                    id="profile-locale"
                    className="h-11 w-full rounded-lg border border-border bg-surface-sunken px-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45"
                    {...profileForm.register('locale')}
                  >
                    <option value="ar">{t('language.arabic')}</option>
                    <option value="en">{t('language.english')}</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  isLoading={profileForm.formState.isSubmitting}
                >
                  {t('auth.profile.save')}
                </Button>
              </form>
            </Card>

            <Card>
              <CardHeader title={t('auth.profile.securitySection')} />

              {passwordError && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
                  <p className="text-sm text-danger">{passwordError}</p>
                </div>
              )}

              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                noValidate
                className="space-y-4"
              >
                <Input
                  label={t('auth.profile.currentPassword')}
                  type="password"
                  autoComplete="current-password"
                  dir="ltr"
                  leadingIcon={<KeyRound className="h-4 w-4" />}
                  error={fieldError(passwordForm.formState.errors.currentPassword?.message)}
                  required
                  {...passwordForm.register('currentPassword')}
                />

                <Input
                  label={t('auth.profile.newPassword')}
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                  leadingIcon={<KeyRound className="h-4 w-4" />}
                  error={fieldError(passwordForm.formState.errors.newPassword?.message)}
                  required
                  {...passwordForm.register('newPassword')}
                />

                <Input
                  label={t('auth.profile.confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                  dir="ltr"
                  leadingIcon={<KeyRound className="h-4 w-4" />}
                  error={fieldError(passwordForm.formState.errors.confirmPassword?.message)}
                  required
                  {...passwordForm.register('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="outline"
                  fullWidth
                  isLoading={passwordForm.formState.isSubmitting}
                >
                  {t('auth.profile.updatePassword')}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
