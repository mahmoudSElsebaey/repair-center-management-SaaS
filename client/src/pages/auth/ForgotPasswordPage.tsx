import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react';

import { AuthShell } from '@/features/auth/components/AuthShell';
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/schemas';
import { authApi } from '@/features/auth/authApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SuccessState } from '@/components/feedback/States';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/utils';

/**
 * Password reset request.
 *
 * The API always answers 200 regardless of whether the address exists, so this
 * screen repeats that guarantee rather than hinting at account existence. In
 * development the API also returns the token, which is surfaced here as a
 * shortcut instead of pretending an email was delivered.
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('auth.forgot.title'));

  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);

    try {
      const result = await authApi.forgotPassword(values.email.trim().toLowerCase());
      setSentTo(values.email.trim().toLowerCase());
      setDevToken(result?.devResetToken ?? null);
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : getErrorMessage(error, t('states.errorBody'))
      );
    }
  };

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('auth.forgot.title')}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{t('auth.forgot.subtitle')}</p>
      </div>

      {sentTo ? (
        <div className="space-y-5">
          <SuccessState
            title={t('auth.forgot.success')}
            description={sentTo}
            action={
              <Button
                variant="outline"
                leadingIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => setSentTo(null)}
              >
                {t('auth.forgot.backToLogin')}
              </Button>
            }
          />

          {devToken && (
            <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-warning">
                <MailCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('auth.forgot.devLinkTitle')}
              </p>
              <p className="mt-1.5 text-xs text-foreground-muted">
                {t('auth.forgot.devLinkBody')}
              </p>
              <Link
                to={`/reset-password?token=${encodeURIComponent(devToken)}`}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3.5 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-surface-hover"
              >
                {t('auth.forgot.devLinkCta')}
                <ArrowRight className="h-3.5 w-3.5 rf-flip-rtl" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
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
              error={
                errors.email?.message
                  ? t(errors.email.message, { defaultValue: errors.email.message })
                  : undefined
              }
              required
              {...register('email')}
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              trailingIcon={<ArrowRight className="h-4 w-4" />}
            >
              {isSubmitting ? t('common.sending') : t('auth.forgot.submit')}
            </Button>
          </form>
        </>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 transition-colors duration-fast hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5 rf-flip-rtl" aria-hidden="true" />
          {t('auth.forgot.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  );
}
