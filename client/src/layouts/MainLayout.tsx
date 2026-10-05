import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Menu, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/layout/LanguageToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SkipLink } from '@/components/a11y/SkipLink';
import { useAppSelector } from '@/store/hooks';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

/** Section anchors used by the landing page navigation. */
const SECTIONS = [
  { id: 'how', key: 'landing.nav.how' },
  { id: 'workflow', key: 'landing.nav.workflow' },
  { id: 'features', key: 'landing.nav.features' },
  { id: 'inventory', key: 'landing.nav.inventory' },
  { id: 'analytics', key: 'landing.nav.analytics' },
  { id: 'services', key: 'landing.showcase.services.overline' },
  { id: 'pricing', key: 'landing.nav.pricing' },
] as const;

/**
 * Public site shell: sticky header, marketing content, footer.
 *
 * The header condenses on scroll and becomes a full-height drawer on mobile,
 * where the section links are least useful and the two calls to action are
 * most useful.
 */
export function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const prefersReduced = useReducedMotion();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close the drawer on navigation and lock the page behind it.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [menuOpen]);

  /**
   * Anchor links must work from any route. On a sub-page we navigate home first
   * and let the browser land on the hash.
   */
  const sectionHref = (id: string) => (location.pathname === '/' ? `#${id}` : `/#${id}`);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SkipLink label={t('a11y.skipToContent', { defaultValue: 'Skip to content' })} />

      <header
        className={cn(
          'sticky top-0 z-sticky w-full transition-all duration-normal ease-soft',
          scrolled
            ? 'border-b border-border bg-background/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <div className="rf-container flex h-header items-center justify-between gap-4">
          <Link
            to="/"
            className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={t('brand.name')}
          >
            <Logo size="lg" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('landing.nav.features')}>
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={sectionHref(section.id)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
              >
                {t(section.key)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />

            {isAuthenticated ? (
              <Button
                size="sm"
                className="hidden sm:inline-flex"
                leadingIcon={<LayoutDashboard className="h-4 w-4" />}
                onClick={() => window.location.assign('/app')}
              >
                {t('nav.dashboard')}
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => window.location.assign('/login')}
                >
                  {t('landing.nav.signIn')}
                </Button>
                <Button
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => window.location.assign('/login')}
                >
                  {t('landing.nav.cta')}
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? t('dashboardShell.closeMenu') : t('dashboardShell.openMenu')}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground lg:hidden"
            >
              {menuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-header z-drawer border-b border-border bg-background/97 backdrop-blur-xl lg:hidden"
          >
            <nav className="rf-container flex flex-col gap-1 py-5" aria-label={t('landing.nav.features')}>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={sectionHref(section.id)}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium text-foreground-muted transition-colors duration-fast hover:bg-surface-hover hover:text-foreground"
                >
                  {t(section.key)}
                </a>
              ))}

              <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-5">
                <Button
                  fullWidth
                  onClick={() => window.location.assign(isAuthenticated ? '/app' : '/login')}
                >
                  {isAuthenticated ? t('nav.dashboard') : t('landing.nav.cta')}
                </Button>

                {!isAuthenticated && (
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => window.location.assign('/login')}
                  >
                    {t('landing.nav.signIn')}
                  </Button>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
