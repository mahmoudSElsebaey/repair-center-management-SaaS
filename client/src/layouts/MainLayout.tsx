import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, LayoutDashboard, Menu, MessageCircle, X } from 'lucide-react';
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
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
      setShowBackToTop(window.scrollY > 420);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection(null);
      return;
    }

    const elements = SECTIONS
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-25% 0px -60% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [location.pathname]);

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



  const whatsappUrl = 'https://wa.me/201022674412';
  const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });

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
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast hover:bg-surface-hover hover:text-foreground',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-muted'
                )}
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
                  className={cn(
                    'rounded-lg px-3 py-3 text-base font-medium transition-colors duration-fast hover:bg-surface-hover hover:text-foreground',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground-muted'
                  )}
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

      <div className="fixed bottom-5 end-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:end-7">
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              type="button"
              onClick={scrollToTop}
              aria-label={t('landing.floating.backToTop')}
              title={t('landing.floating.backToTop')}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.75, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.75, y: 14 }}
              transition={{ duration: prefersReduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="group flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-background/90 text-primary shadow-lg shadow-primary/10 backdrop-blur-xl transition-transform duration-fast hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ArrowUp className="h-5 w-5 transition-transform duration-fast group-hover:-translate-y-0.5" aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>

        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('landing.floating.whatsapp')}
          title={t('landing.floating.whatsapp')}
          whileHover={prefersReduced ? undefined : { scale: 1.06, y: -2 }}
          whileTap={prefersReduced ? undefined : { scale: 0.96 }}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#25D366] text-white shadow-xl shadow-[#25D366]/20 transition-colors duration-fast hover:bg-[#20bd5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/60"
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
        </motion.a>
      </div>
    </div>
  );
}
