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
      <HowItWorksSection />
      <WorkflowSection />
      <FeaturesSection />
      <InventorySection />
      <TrackingSection />
      <AnalyticsSection />
      <TestimonialsSection />
      <PricingSection />
      <CtaSection />
    </PageTransition>
  );
}
