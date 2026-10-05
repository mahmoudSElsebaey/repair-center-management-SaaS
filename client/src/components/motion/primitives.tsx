import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Motion primitives.
 *
 * Every animation in Fixer goes through this file so that
 * `prefers-reduced-motion` is honoured in exactly one place: when it is set,
 * transforms are dropped and content simply appears.
 */

export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

export function useMotionVariants() {
  const prefersReduced = useReducedMotion();

  const fadeUp: Variants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : {
        hidden: { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SOFT } },
      };

  const fadeIn: Variants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.45, ease: EASE_SOFT } },
      };

  const stagger: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: prefersReduced ? 0 : 0.07, delayChildren: 0.04 },
    },
  };

  const scaleIn: Variants = prefersReduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : {
        hidden: { opacity: 0, scale: 0.96 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: EASE_SOFT } },
      };

  return { prefersReduced, fadeUp, fadeIn, stagger, scaleIn };
}

/**
 * Reveals content as it scrolls into view, once.
 *
 * `viewport.once` keeps sections from re-animating when the user scrolls back
 * up, which is the single most common source of motion sickness in marketing
 * pages.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const { fadeUp } = useMotionVariants();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

/** Container that staggers its `RevealItem` children. */
export function RevealGroup({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'section';
}) {
  const { stagger } = useMotionVariants();
  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const { fadeUp } = useMotionVariants();
  const MotionTag = motion[as];

  return (
    <MotionTag className={className} variants={fadeUp}>
      {children}
    </MotionTag>
  );
}

/**
 * Animated page wrapper for route-level transitions.
 * Kept intentionally subtle — a 12px lift, not a slide-and-zoom.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { prefersReduced } = useMotionVariants();

  return (
    <motion.div
      className={cn(className)}
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      transition={{ duration: prefersReduced ? 0 : 0.28, ease: EASE_SOFT }}
    >
      {children}
    </motion.div>
  );
}
