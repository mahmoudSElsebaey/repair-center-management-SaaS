import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { A11y, Autoplay, Keyboard, Pagination } from 'swiper/modules';
import { Check, Quote, ShieldCheck } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/primitives';
import { Button } from '@/components/ui/Button';
import { initials } from '@/lib/utils';

/* ========================================================================== */
/* Testimonials — Swiper carousel                                              */
/* ========================================================================== */

const TESTIMONIAL_KEYS = ['one', 'two', 'three', 'four'] as const;

/**
 * Voice-of-customer carousel.
 *
 * Swiper is used here because a horizontal, swipeable, auto-advancing set is
 * genuinely the right pattern on mobile — not decoration. Autoplay respects
 * reduced motion through the shared `rf-swiper` styles, and A11y + Keyboard
 * modules keep it operable without a pointer.
 */
export function TestimonialsSection() {
  const { t } = useTranslation();

  return (
    <Section id="testimonials" className="border-y border-border bg-surface/30">
      <Reveal>
        <SectionHeading
          overline={t('landing.testimonials.overline')}
          title={t('landing.testimonials.title')}
        />
      </Reveal>

      <Reveal delay={0.08} className="mt-14">
        <Swiper
          modules={[A11y, Autoplay, Pagination, Keyboard]}
          className="rf-swiper !pb-1"
          spaceBetween={20}
          slidesPerView={1}
          grabCursor
          keyboard={{ enabled: true }}
          autoplay={{ delay: 6500, disableOnInteraction: true, pauseOnMouseEnter: true }}
          pagination={{ clickable: true }}
          a11y={{
            containerMessage: t('landing.testimonials.title'),
            paginationBulletMessage: '{{index}}',
          }}
          breakpoints={{
            640: { slidesPerView: 1.6, spaceBetween: 20 },
            900: { slidesPerView: 2.2, spaceBetween: 20 },
            1200: { slidesPerView: 2.6, spaceBetween: 24 },
          }}
        >
          {TESTIMONIAL_KEYS.map((key) => (
            <SwiperSlide key={key} className="!h-auto">
              <figure className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface p-6 shadow-sm">
                <Quote className="h-6 w-6 text-primary/40" aria-hidden="true" />

                <blockquote className="mt-5 flex-1 text-sm leading-relaxed text-foreground-muted">
                  “{t(`landing.testimonials.items.${key}.quote`)}”
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated text-xs font-semibold text-foreground"
                    aria-hidden="true"
                  >
                    {initials(t(`landing.testimonials.items.${key}.name`))}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t(`landing.testimonials.items.${key}.name`)}
                    </p>
                    <p className="truncate text-xs text-foreground-subtle">
                      {t(`landing.testimonials.items.${key}.role`)}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </SwiperSlide>
          ))}
        </Swiper>
      </Reveal>
    </Section>
  );
}

/* ========================================================================== */
/* Pricing                                                                     */
/* ========================================================================== */

const PLANS = [
  {
    key: 'starter',
    price: '1,900',
    highlighted: false,
    features: ['feature1', 'feature2', 'feature3', 'feature4'],
  },
  {
    key: 'workshop',
    price: '4,400',
    highlighted: true,
    features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'],
  },
  {
    key: 'chain',
    price: '9,800',
    highlighted: false,
    features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'],
  },
] as const;

export function PricingSection() {
  const { t } = useTranslation();

  return (
    <Section id="pricing">
      <Reveal>
        <SectionHeading
          overline={t('landing.pricing.overline')}
          title={t('landing.pricing.title')}
          subtitle={t('landing.pricing.subtitle')}
        />
      </Reveal>

      <RevealGroup className="mt-14 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <RevealItem key={plan.key} className="h-full">
            <article
              className={
                plan.highlighted
                  ? 'relative flex h-full flex-col rounded-xl border-2 border-primary/40 bg-elevated p-6 shadow-lg'
                  : 'relative flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-sm'
              }
            >
              {plan.highlighted && (
                <span className="absolute -top-3 start-6 rounded-full bg-brand-gradient px-3 py-1 text-2xs font-semibold text-primary-foreground shadow-sm">
                  {t('landing.pricing.popular')}
                </span>
              )}

              <h3 className="text-base font-semibold text-foreground">
                {t(`landing.pricing.plans.${plan.key}.name`)}
              </h3>

              <p className="mt-1.5 text-sm text-foreground-muted">
                {t(`landing.pricing.plans.${plan.key}.description`)}
              </p>

              <p className="mt-6 flex items-baseline gap-1.5">
                <span className="numeric text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-foreground-subtle">
                  {t('common.currency')} {t('landing.pricing.perMonth')}
                </span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 border-t border-border pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground-muted">
                      {t(`landing.pricing.plans.${plan.key}.${feature}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-7"
                fullWidth
                variant={plan.highlighted ? 'primary' : 'outline'}
                onClick={() => window.location.assign('/login')}
              >
                {t('landing.pricing.cta')}
              </Button>
            </article>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.1}>
        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-foreground-subtle">
          {t('landing.pricing.subtitle')}
        </p>
      </Reveal>
    </Section>
  );
}

/* ========================================================================== */
/* Final CTA                                                                   */
/* ========================================================================== */

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <Section id="cta">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-elevated px-6 py-14 text-center shadow-lg sm:px-12">
          {/* Brand backdrop */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="rf-tech-grid absolute inset-0 opacity-40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(79,91,245,0.28),transparent_60%)]" />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold text-balance sm:text-4xl">
              {t('landing.cta.title')}
            </h2>

            <p className="mt-4 text-base text-foreground-muted text-pretty">
              {t('landing.cta.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={() => window.location.assign('/login')}>
                {t('landing.cta.primary')}
              </Button>

              <Button
                variant="outline"
                size="lg"
                leadingIcon={<ShieldCheck className="h-4 w-4" />}
                onClick={() => {
                  document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {t('landing.cta.secondary')}
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
