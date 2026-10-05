import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { BarChart3, Boxes, ClipboardList, CreditCard, QrCode, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/motion/primitives';

const SHOWCASE_PANELS = [
  { key: 'tickets', image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=2200&q=90' },
  { key: 'inventory', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=90' },
  { key: 'analytics', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2200&q=90' },
] as const;

const SERVICES = [
  { key: 'repair', icon: ClipboardList, image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=90' },
  { key: 'inventory', icon: Boxes, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=90' },
  { key: 'customers', icon: Users, image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=90' },
  { key: 'finance', icon: CreditCard, image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=90' },
  { key: 'tracking', icon: QrCode, image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=90' },
  { key: 'analytics', icon: BarChart3, image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=90' },
] as const;

function ImmersivePanel({
  panel,
  index,
  t,
}: {
  panel: (typeof SHOWCASE_PANELS)[number];
  index: number;
  t: (key: string) => string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-7%', '7%']);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], [1.08, 1.02, 1.08]);

  return (
    <section ref={ref} className="relative min-h-[82vh] overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: imageY, scale: imageScale }} aria-hidden="true">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(' + panel.image + ')' }} />
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(79,91,245,0.22),transparent_55%)]" />
      </motion.div>
      <div className="relative flex min-h-[82vh] items-center py-20 sm:py-28">
        <div className="rf-container w-full">
          <Reveal>
            <div className="max-w-2xl rounded-2xl border border-white/15 bg-black/35 p-7 shadow-2xl backdrop-blur-md sm:p-10">
              <p className="rf-overline text-white/70">0{index + 1}</p>
              <h3 className="mt-3 text-3xl font-bold text-white text-balance sm:text-5xl">
                {t('landing.showcase.panels.' + panel.key + '.title')}
              </h3>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                {t('landing.showcase.panels.' + panel.key + '.body')}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function VisualShowcaseSection() {
  const { t } = useTranslation();

  return (
    <div className="border-y border-border bg-black">
      <div className="rf-container py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            align="start"
            overline={t('landing.showcase.overline')}
            title={t('landing.showcase.title')}
            subtitle={t('landing.showcase.subtitle')}
          />
        </Reveal>
      </div>
      {SHOWCASE_PANELS.map((panel, index) => (
        <ImmersivePanel key={panel.key} panel={panel} index={index} t={t} />
      ))}
    </div>
  );
}

export function ServicesShowcaseSection() {
  const { t } = useTranslation();

  return (
    <Section id="services" className="overflow-hidden border-b border-border bg-surface/20">
      <Reveal>
        <SectionHeading
          overline={t('landing.showcase.services.overline')}
          title={t('landing.showcase.services.title')}
          subtitle={t('landing.showcase.services.subtitle')}
        />
      </Reveal>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map(({ key, icon: Icon, image }, index) => (
          <Reveal key={key} delay={index * 0.04}>
            <motion.article
              className="group h-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
              style={{ transformStyle: 'preserve-3d' }}
              whileHover={{
                rotateX: -3,
                rotateY: 4,
                y: -8,
                scale: 1.015,
                transition: { type: 'spring', stiffness: 260, damping: 20 },
              }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <motion.img
                  src={image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute bottom-4 start-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur-md">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="relative p-6">
                <h3 className="text-lg font-semibold text-foreground">
                  {t('landing.showcase.services.items.' + key + '.title')}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                  {t('landing.showcase.services.items.' + key + '.body')}
                </p>
              </div>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}


export function VisualBreakSection({
  image,
  title,
  body,
}: {
  image: string;
  title: string;
  body: string;
}) {
  return (
    <section
      className="relative min-h-[58vh] overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: 'url(' + image + ')' }}
    >
      <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(79,91,245,0.22),transparent_60%)]" aria-hidden="true" />
      <div className="relative flex min-h-[58vh] items-center justify-center px-6 py-20 text-center">
        <Reveal>
          <div className="max-w-3xl rounded-2xl border border-white/15 bg-black/30 p-8 shadow-2xl backdrop-blur-md sm:p-12">
            <h2 className="text-3xl font-bold text-white text-balance sm:text-5xl">{title}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{body}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
