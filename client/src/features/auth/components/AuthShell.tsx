import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ToastViewport } from '@/components/feedback/Toast';

/**
 * Shared authentication shell.
 *
 * Split layout on desktop: the brand panel carries the product promise and a
 * live workflow motif, while the form side stays deliberately quiet so nothing
 * competes with the fields. On mobile the panel collapses to a compact header.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh bg-background">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden w-[46%] shrink-0 overflow-hidden border-e border-border bg-surface/40 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="rf-tech-grid absolute inset-0 opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(79,91,245,0.22),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_90%,rgba(34,211,238,0.14),transparent_55%)]" />
        </div>

        <div className="relative flex flex-1 flex-col p-10 xl:p-12">
          <Link
            to="/"
            className="w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={t('brand.name')}
          >
            <Logo size="lg" suffix={t('brand.tagline')} />
          </Link>

          <div className="mt-auto max-w-md">
            <h2 className="text-2xl font-bold text-balance xl:text-3xl">
              {t('landing.hero.title')}{' '}
              <span className="rf-brand-text">{t('landing.hero.titleAccent')}</span>
            </h2>

            <p className="mt-4 text-sm text-foreground-muted">{t('landing.hero.subtitle')}</p>

            {/* Miniature workflow motif — reinforces what the product does */}
            <ol className="mt-8 space-y-3.5">
              {(['received', 'diagnosing', 'approved', 'in_repair'] as const).map((stage, index) => (
                <li key={stage} className="flex items-center gap-3.5">
                  <span
                    className={
                      index < 3
                        ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-success bg-success'
                        : 'relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary-soft'
                    }
                    aria-hidden="true"
                  >
                    {index < 3 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-success-foreground" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </span>

                  <span
                    className={
                      index <= 3 ? 'text-sm text-foreground' : 'text-sm text-foreground-muted'
                    }
                  >
                    {t(`landing.workflow.stages.${stage}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-10 text-xs text-foreground-subtle">{t('landing.footer.builtWith')}</p>
        </div>
      </aside>

      {/* ---------- Form panel ---------- */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg text-sm text-foreground-muted transition-colors duration-fast hover:text-foreground lg:invisible"
          >
            <ArrowLeft className="h-4 w-4 rf-flip-rtl" aria-hidden="true" />
            {t('auth.login.backHome')}
          </Link>

          <div className="ms-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
          <div className="w-full max-w-md">
            {/* Compact brand mark on small screens, where the panel is hidden */}
            <div className="mb-8 lg:hidden">
              <Logo size="lg" suffix={t('brand.tagline')} />
            </div>

            {children}

            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </main>

        <footer className="px-5 pb-6 text-center sm:px-8">
          <p className="text-xs text-foreground-subtle">
            © {new Date().getFullYear()} {t('brand.name')} · {t('landing.footer.rights')}
          </p>
        </footer>
      </div>

      <ToastViewport closeLabel={t('common.close')} />
    </div>
  );
}
