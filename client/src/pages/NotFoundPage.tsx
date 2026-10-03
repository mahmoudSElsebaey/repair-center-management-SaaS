import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** 404 screen. Offers a way home and back into the console rather than a dead end. */
export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(t('notFound.title'));

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="rf-tech-grid absolute inset-0 opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(79,91,245,0.18),transparent_60%)]" />
      </div>

      <header className="rf-container relative flex h-header items-center justify-between">
        <Link to="/" aria-label={t('brand.name')}>
          <Logo size="md" />
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="rf-container relative flex flex-1 items-center justify-center py-16">
        <div className="max-w-lg text-center">
          <p className="numeric text-7xl font-extrabold text-foreground/10 sm:text-9xl">
            {t('notFound.code')}
          </p>

          <div className="mx-auto -mt-6 mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface text-secondary">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">{t('notFound.title')}</h1>

          <p className="mt-3 text-sm text-foreground-muted">{t('notFound.body')}</p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button leadingIcon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
              {t('notFound.cta')}
            </Button>

            <Button variant="outline" onClick={() => navigate('/app')}>
              {t('landing.cta.primary')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
