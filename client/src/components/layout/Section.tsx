import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Marketing section wrapper.
 *
 * Every landing section shares the same rhythm: an overline, a headline, an
 * optional lead paragraph, then content. Centralising it keeps vertical
 * spacing consistent as sections are added or reordered.
 */
export function Section({
  id,
  children,
  className,
  containerClassName,
  bleed = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  /** Skips the container — used by full-width artwork. */
  bleed?: boolean;
}) {
  return (
    <section id={id} className={cn('scroll-mt-header py-20 sm:py-24', className)}>
      <div className={cn(!bleed && 'rf-container', containerClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  overline,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  overline?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'start';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-start',
        className
      )}
    >
      {overline && (
        <p className="mb-3 flex items-center gap-3 rf-overline">
          {align === 'center' && <span className="hidden h-px flex-1 bg-border sm:block" />}
          <span className={cn(align === 'center' && 'mx-auto')}>{overline}</span>
          {align === 'center' && <span className="hidden h-px flex-1 bg-border sm:block" />}
        </p>
      )}

      <h2 className="text-3xl font-bold text-balance sm:text-4xl">{title}</h2>

      {subtitle && (
        <p className="mt-4 text-base text-foreground-muted text-pretty sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}

/** Small pill used for badges above headlines. */
export function Pill({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3.5 py-1.5',
        'text-xs font-medium text-foreground-muted backdrop-blur-sm',
        className
      )}
    >
      {icon && (
        <span className="shrink-0 text-secondary" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
