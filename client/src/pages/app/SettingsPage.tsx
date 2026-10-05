import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Moon, Sun, UserRound, ExternalLink } from 'lucide-react';

import { Card, CardHeader } from '@/components/ui/Card';
import { PageTransition } from '@/components/motion/primitives';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setLocale, setTheme } from '@/store/uiSlice';
import { changeLanguage } from '@/i18n';
import type { Locale, Theme } from '@/types/domain';
import { cn } from '@/lib/utils';

/**
 * Operations settings — language, theme, and account shortcuts.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('settings.title'));

  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.ui.locale);
  const theme = useAppSelector((s) => s.ui.theme);
  const user = useAppSelector((s) => s.auth.user);

  const switchLocale = async (next: Locale) => {
    dispatch(setLocale(next));
    await changeLanguage(next);
  };

  const switchTheme = (next: Theme) => {
    dispatch(setTheme(next));
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('settings.title')}</h1>
          <p className="mt-1.5 text-sm text-foreground-muted">{t('settings.subtitle')}</p>
        </div>

        <Card>
          <CardHeader title={t('settings.appearance')} description={t('settings.appearanceBody')} />
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'light' as const, icon: Sun, label: t('theme.light') },
                { id: 'dark' as const, icon: Moon, label: t('theme.dark') },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTheme(id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
                  theme === id
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.language')} description={t('settings.languageBody')} />
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'ar' as const, label: t('language.arabic') },
                { id: 'en' as const, label: t('language.english') },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => void switchLocale(id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors',
                  locale === id
                    ? 'border-primary/40 bg-primary-soft text-primary'
                    : 'border-border bg-surface text-foreground-muted hover:bg-surface-hover'
                )}
              >
                <Globe className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.account')} description={t('settings.accountBody')} />
          <div className="space-y-3 text-sm">
            <p className="text-foreground">
              <span className="text-foreground-muted">{t('auth.profile.name')}: </span>
              {user?.name ?? '—'}
            </p>
            <p className="text-foreground">
              <span className="text-foreground-muted">{t('auth.profile.email')}: </span>
              <span dir="ltr">{user?.email ?? '—'}</span>
            </p>
            <p className="text-foreground">
              <span className="text-foreground-muted">{t('auth.profile.role')}: </span>
              {user?.role ? t(`roles.${user.role}`) : '—'}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                to="/app/profile"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-foreground-muted hover:bg-surface-hover hover:text-foreground"
              >
                <UserRound className="h-4 w-4" />
                {t('auth.profile.title')}
              </Link>
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-foreground-muted hover:bg-surface-hover hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                {t('dashboardShell.visitWebsite')}
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
