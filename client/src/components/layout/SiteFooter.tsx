import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Github, Mail, MapPin, Phone } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

/** Public site footer. Keeps the landing page honest about what is shipped. */
export function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const productLinks = [
    { key: 'landing.nav.features', href: '/#features' },
    { key: 'landing.nav.workflow', href: '/#workflow' },
    { key: 'landing.nav.inventory', href: '/#inventory' },
    { key: 'landing.nav.pricing', href: '/#pricing' },
  ];

  const companyLinks = [
    { key: 'landing.footer.about', href: '/about' },
    { key: 'landing.footer.contact', href: '/contact' },
  ];

  const resourceLinks = [
    { key: 'landing.footer.docs', href: '/docs' },
    { key: 'landing.footer.status', href: '/status' },
  ];

  const legalLinks = [
    { key: 'landing.footer.privacy', href: '/privacy' },
    { key: 'landing.footer.terms', href: '/terms' },
  ];

  return (
    <footer className="relative mt-24 border-t border-border bg-surface/40">
      <div className="rf-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo size="md" suffix={t('brand.tagline')} />

            <p className="mt-5 max-w-sm text-sm text-foreground-muted">
              {t('landing.footer.tagline')}
            </p>

            <ul className="mt-5 space-y-2.5 text-sm text-foreground-subtle">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Cairo · Alexandria</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <a
                  href="mailto:hello@fixer.app"
                  className="transition-colors duration-fast hover:text-foreground"
                >
                  hello@fixer.app
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="numeric" dir="ltr">
                  +20 2 2670 4412
                </span>
              </li>
            </ul>
          </div>

          <FooterColumn title={t('landing.footer.product')} links={productLinks} />
          <FooterColumn title={t('landing.footer.company')} links={companyLinks} />
          <FooterColumn title={t('landing.footer.resources')} links={resourceLinks} />
          <FooterColumn title={t('landing.footer.legal')} links={legalLinks} />
        </div>

        <hr className="rf-divider my-9" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-foreground-subtle">
            © {year} Fixer. {t('landing.footer.rights')}
          </p>

          <div className="flex items-center gap-4">
            <p className="text-xs text-foreground-subtle">{t('landing.footer.builtWith')}</p>
            <a
              href="https://github.com/mahmoudSElsebaey"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
              className="text-foreground-subtle transition-colors duration-fast hover:text-foreground"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { key: string; href: string }[];
}) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="rf-overline">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              to={link.href}
              className="text-sm text-foreground-muted transition-colors duration-fast hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
