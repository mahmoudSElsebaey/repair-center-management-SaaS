import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ArrowRight, Lock } from 'lucide-react';

import { AuthShell } from '@/features/auth/components/AuthShell';
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from '@/features/auth/schemas';
import { authApi } from '@/features/auth/authApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorState, SuccessState } from '@/components/feedback/States';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/utils';

/**
 * Password reset completion.
 *
 * The token arrives in the query string. A missing token is treated as a broken
 * link rather than a validation error, because the user cannot fix it by
 * typing.
 */
export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  useDocumentTitle(t('auth.reset.title'));

  const [serverError, setServerError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError(null);

    try {
      await authApi.resetPassword(token, values.password);
      setSucceeded(true);
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : getErrorMessage(error, t('states.errorBody'))
      );
    }
  };

  const fieldError = (message?: string) =>
    message ? t(message, { defaultValue: message }) : undefined;

  /* ---------- Missing token ---------- */
  if (!token) {
    return (
      <AuthShell>
        <ErrorState
          title={t('auth.reset.missingToken')}
          description={t('auth.reset.subtitle')}
          detail={undefined}
        />
        <div className="mt-6 text-center">
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t('auth.forgot.submit')}
          </Link>
        </div>
      </AuthShell>
    );
  }

  /* ---------- Success ---------- */
  if (succeeded) {
    return (
      <AuthShell>
        <SuccessState
          title={t('auth.reset.success')}
          action={
            <Button
              leadingIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/login', { replace: true })}
            >
              {t('auth.reset.backToLogin')}
            </Button>
          }
        />
      </AuthShell>
    );
  }

  /* ---------- Form ---------- */
  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('auth.reset.title')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{t('auth.reset.subtitle')}</p>
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
          label={t('auth.reset.password')}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          leadingIcon={<Lock className="h-4 w-4" />}
          hint={t('validation.passwordMin')}
          error={fieldError(errors.password?.message)}
          required
          {...register('password')}
        />

        <Input
          label={t('auth.reset.confirm')}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          leadingIcon={<Lock className="h-4 w-4" />}
          error={fieldError(errors.confirmPassword?.message)}
          required
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          trailingIcon={<ArrowRight className="h-4 w-4" />}
        >
          {isSubmitting ? t('common.saving') : t('auth.reset.submit')}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 transition-colors duration-fast hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 rf-flip-rtl" aria-hidden="true" />
          {t('auth.reset.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  );
}
