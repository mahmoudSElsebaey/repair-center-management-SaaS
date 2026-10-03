import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/layout/Section';
import { HeroSceneLoader } from '@/components/3d/HeroSceneLoader';
import { useMotionVariants } from '@/components/motion/primitives';

/**
 * Landing hero.
 *
 * The composition is deliberately asymmetric — copy on the reading edge, the
 * 3D core on the other — so the first screen reads as an operations product
 * rather than a centred marketing template.
 */
export function HeroSection() {
  const { t } = useTranslation();
  const { fadeUp, stagger, prefersReduced } = useMotionVariants();

  const stats = [
    { value: '9', label: t('landing.hero.stats.tickets') },
    { value: '5', label: t('landing.hero.stats.parts') },
    { value: '100%', label: t('landing.hero.stats.approval') },
  ];

  return (
    <section className="relative overflow-hidden pt-16 sm:pt-20 lg:pt-24">
      {/* Technical backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="rf-tech-grid absolute inset-0 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(79,91,245,0.20),transparent_58%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="rf-container relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          {/* ---------- Copy ---------- */}
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <Pill icon={<Sparkles className="h-3.5 w-3.5" />}>
                {t('landing.hero.badge')}
              </Pill>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl font-extrabold text-balance sm:text-6xl"
            >
              {t('landing.hero.title')}{' '}
              <span className="rf-brand-text">{t('landing.hero.titleAccent')}</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-xl text-lg text-foreground-muted text-pretty"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                trailingIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => window.location.assign('/login')}
              >
                {t('landing.hero.ctaPrimary')}
              </Button>

              <Button
                variant="outline"
                size="lg"
                leadingIcon={<PlayCircle className="h-4 w-4" />}
                onClick={() => {
                  document.getElementById('workflow')?.scrollIntoView({
                    behavior: prefersReduced ? 'auto' : 'smooth',
                    block: 'start',
                  });
                }}
              >
                {t('landing.hero.ctaSecondary')}
              </Button>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="mt-5 flex items-center gap-2 text-xs text-foreground-subtle"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('landing.hero.trustNote')}
            </motion.p>

            {/* ---------- Stat strip ---------- */}
            <motion.dl
              variants={fadeUp}
              className="mt-11 grid max-w-lg grid-cols-3 gap-5 border-t border-border pt-7"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="numeric text-2xl font-bold text-foreground sm:text-3xl">
                    {stat.value}
                  </dt>
                  <dd className="mt-1.5 text-xs leading-snug text-foreground-subtle">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* ---------- 3D core ---------- */}
          <motion.div
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            className="relative"
          >
            <HeroSceneLoader className="mx-auto aspect-square w-full max-w-[34rem]" />

            {/* Floating ticket chip — anchors the abstract scene in the product */}
            <div className="pointer-events-none absolute inset-x-4 bottom-2 mx-auto max-w-sm sm:inset-x-8">
              <div className="rf-glass flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg">
                <span className="rf-live-dot shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="numeric text-xs font-semibold text-foreground" dir="ltr">
                    RF-2026-00421
                  </p>
                  <p className="truncate text-2xs text-foreground-muted">
                    {t('landing.workflow.stages.in_repair')}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-primary-soft px-2 py-1 text-2xs font-medium text-primary">
                  {t('landing.workflow.stages.approved')}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
