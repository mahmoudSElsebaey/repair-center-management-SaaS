import { useTranslation } from 'react-i18next';
import { PageTransition } from '@/components/motion/primitives';
import { HeroSection } from '@/components/landing/HeroSection';
import {
  AnalyticsSection,
  FeaturesSection,
  HowItWorksSection,
  WorkflowSection,
} from '@/components/landing/ShowcaseSections';
import { InventorySection, TrackingSection } from '@/components/landing/OperationsSections';
import {
  CtaSection,
  PricingSection,
  TestimonialsSection,
} from '@/components/landing/SocialProofSections';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ServicesShowcaseSection, VisualBreakSection, VisualShowcaseSection } from '@/components/landing/VisualShowcaseSections';

/**
 * Public marketing page.
 *
 * Section order tells the product story: what it is, how the work flows, what
 * is included, then the two areas that are hardest to do well (inventory and
 * customer tracking), then proof, packaging and the call to action.
 */
export default function LandingPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('meta.title'));

  return (
    <PageTransition>
      <HeroSection />
      <div className="pt-20"><VisualShowcaseSection /></div>
      <ServicesShowcaseSection />
      <HowItWorksSection />
      <WorkflowSection />
      <FeaturesSection />
      <VisualBreakSection
        image="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=90"
        title={t('landing.showcase.breaks.inventory.title')}
        body={t('landing.showcase.breaks.inventory.body')}
      />
      <InventorySection />
      <TrackingSection />
      <AnalyticsSection />
      <TestimonialsSection />
      <VisualBreakSection
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=2200&q=90"
        title={t('landing.showcase.breaks.pricing.title')}
        body={t('landing.showcase.breaks.pricing.body')}
      />
      <PricingSection />
      <CtaSection />
    </PageTransition>
  );
}
