import { motion, useScroll, useTransform } from 'framer-motion';
import { Autoplay, EffectFade } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-fade';
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

export function VisualShowcaseSection() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-border bg-surface/20 py-16 sm:py-20">
      <div className="rf-container">
        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-background/70 shadow-xl backdrop-blur-sm">
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            autoplay={{ delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            loop
            speed={850}
            className="rf-showcase-swiper"
          >
            {SHOWCASE_PANELS.map((panel, index) => (
              <SwiperSlide key={panel.key}>
                <div className="relative min-h-[520px] overflow-hidden sm:min-h-[620px]">
                  <motion.img
                    src={panel.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    initial={{ scale: 1.08 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: false }}
                    transition={{ duration: 4, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/65 to-background/10 dark:from-background/95 dark:via-background/70 dark:to-background/15" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(79,91,245,0.18),transparent_45%)]" />

                  <div className="relative flex min-h-[520px] items-center sm:min-h-[620px]">
                    <div className="rf-container w-full">
                      <motion.div
                        key={panel.key}
                        initial={{ opacity: 0, y: 28, x: -18 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                        className="max-w-xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.38)] dark:drop-shadow-[0_4px_14px_rgba(0,0,0,0.72)]"
                      >
                        <p className="rf-overline">{String(index + 1).padStart(2, '0')}</p>
                        <h3 className="mt-3 text-3xl font-bold text-foreground text-balance sm:text-5xl">
                          {t('landing.showcase.panels.' + panel.key + '.title')}
                        </h3>
                        <p className="mt-5 text-base leading-relaxed text-foreground-muted drop-shadow-[0_2px_7px_rgba(0,0,0,0.28)] dark:drop-shadow-[0_3px_10px_rgba(0,0,0,0.62)] sm:text-lg">
                          {t('landing.showcase.panels.' + panel.key + '.body')}
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
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
