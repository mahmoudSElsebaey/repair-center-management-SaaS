import { useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BookOpen,
  Building2,
  CheckCircle2,
  FileText,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';

type PageKey = 'about' | 'contact' | 'docs' | 'status' | 'privacy' | 'terms';

const PAGE_KEYS: Record<string, PageKey> = {
  '/about': 'about',
  '/contact': 'contact',
  '/docs': 'docs',
  '/status': 'status',
  '/privacy': 'privacy',
  '/terms': 'terms',
};

const ICONS = {
  about: Building2,
  contact: Mail,
  docs: BookOpen,
  status: Activity,
  privacy: ShieldCheck,
  terms: FileText,
} as const;

export default function PublicInfoPage() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const page = PAGE_KEYS[pathname] ?? 'about';
  const Icon = ICONS[page];

  useDocumentTitle(t(`publicPages.${page}.title`));

  const sectionCount = useMemo(
    () => Number(t(`publicPages.${page}.sectionCount`, { defaultValue: 0 })),
    [page, t]
  );

  return (
    <div className="relative overflow-hidden py-16 sm:py-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="rf-tech-grid absolute inset-0 opacity-30" />
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_50%_0%,rgba(79,91,245,0.14),transparent_65%)]" />
      </div>

      <div className="rf-container relative">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-primary shadow-sm">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>

          <p className="rf-overline mt-6">{t(`publicPages.${page}.overline`)}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t(`publicPages.${page}.title`)}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-foreground-muted sm:text-lg">
            {t(`publicPages.${page}.intro`)}
          </p>
        </header>

        <div
          className={cn(
            'mx-auto mt-12 grid max-w-5xl gap-5',
            sectionCount > 3 ? 'md:grid-cols-2' : 'md:grid-cols-1'
          )}
        >
          {Array.from({ length: sectionCount }, (_, index) => {
            const number = index + 1;
            return (
              <section
                key={number}
                className={cn(
                  'rounded-2xl border border-border bg-surface/70 p-6 shadow-sm backdrop-blur-sm',
                  sectionCount <= 3 && 'mx-auto w-full max-w-3xl'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground sm:text-lg">
                      {t(`publicPages.${page}.section${number}Title`)}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-foreground-muted">
                      {t(`publicPages.${page}.section${number}Body`)}
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {page === 'contact' && (
          <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
            <ContactItem icon={<Mail className="h-4 w-4" />} label="hello@repairflow.app" href="mailto:hello@repairflow.app" />
            <ContactItem icon={<Phone className="h-4 w-4" />} label="+20 2 2670 4412" />
            <ContactItem icon={<MapPin className="h-4 w-4" />} label={t('publicPages.contact.location')} />
          </div>
        )}

        {page === 'status' && (
          <div className="mx-auto mt-8 flex max-w-3xl items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-5 text-sm text-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{t('publicPages.status.liveNote')}</span>
          </div>
        )}

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-background/70 p-6 text-center">
          <p className="text-sm text-foreground-muted">{t('publicPages.shared.footerNote')}</p>
        </div>
      </div>
    </div>
  );
}

function ContactItem({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
}) {
  const content = (
    <span className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm text-foreground-muted transition-colors hover:text-foreground">
      <span className="text-primary">{icon}</span>
      <span dir={href ? 'ltr' : undefined}>{label}</span>
    </span>
  );

  return href ? <a href={href}>{content}</a> : content;
}
