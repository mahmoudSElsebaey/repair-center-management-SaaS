import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';

import { AuthShell } from '@/features/auth/components/AuthShell';
import { DemoAccountsPanel } from '@/features/auth/components/DemoAccountsPanel';
import { loginFormSchema, type LoginFormValues } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/authApi';
import { setCredentials } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppDispatch } from '@/store/hooks';
import { useToast } from '@/components/feedback/Toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/utils';

/**
 * Sign-in screen.
 *
 * The whole vertical slice lives here: Zod validation with localised inline
 * messages, a real POST to `/auth/login`, tokens persisted through Redux, and a
 * redirect to the page the user originally asked for.
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const notify = useToast();

  useDocumentTitle(t('auth.login.title'));

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', remember: true },
    mode: 'onBlur',
  });

  /** Redirect target captured by ProtectedRoute, defaulting to the console. */
  const from = (location.state as { from?: string } | null)?.from ?? '/app';

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      const session = await authApi.login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      dispatch(
        setCredentials({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        })
      );

      notify.success(t('auth.login.successRedirect'), session.user.name);
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : getErrorMessage(error, t('auth.login.error'));

      setServerError(message);
    }
  };

  /** Translates a Zod message key coming out of the resolver. */
  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('auth.login.title')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{t('auth.login.subtitle')}</p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <p className="text-sm text-danger">{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label={t('auth.login.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          dir="ltr"
          placeholder={t('auth.login.emailPlaceholder')}
          leadingIcon={<Mail className="h-4 w-4" />}
          error={fieldError(errors.email?.message)}
          required
          {...register('email')}
        />

        <Input
          label={t('auth.login.password')}
          type="password"
          autoComplete="current-password"
          dir="ltr"
          placeholder={t('auth.login.passwordPlaceholder')}
          leadingIcon={<Lock className="h-4 w-4" />}
          error={fieldError(errors.password?.message)}
          required
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border bg-surface-sunken text-primary focus:ring-2 focus:ring-primary/50"
              {...register('remember')}
            />
            {t('auth.login.remember')}
          </label>

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 transition-colors duration-fast hover:underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          trailingIcon={<ArrowRight className="h-4 w-4" />}
        >
          {isSubmitting ? t('common.loading') : t('auth.login.submit')}
        </Button>
      </form>

      <DemoAccountsPanel
        label={t('auth.login.demoTitle')}
        hint={t('auth.login.demoHint')}
        showLabel={t('auth.login.demoShow')}
        hideLabel={t('auth.login.demoHide')}
        useLabel={t('auth.login.useAccount')}
        onSelect={(email) => {
          setValue('email', email, { shouldValidate: true });
          setValue('password', import.meta.env.VITE_DEMO_PASSWORD ?? '', {
            shouldValidate: true,
          });
        }}
      />

      <p className="mt-8 text-center text-sm text-foreground-subtle">{t('auth.login.noAccount')}</p>
    </AuthShell>
  );
}
