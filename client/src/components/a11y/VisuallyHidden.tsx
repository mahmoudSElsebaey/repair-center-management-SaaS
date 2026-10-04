import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Content visible only to assistive technology (screen readers).
 * Use for labels, live-region announcements, or context that sighted users already see.
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
  className,
  ...rest
}: {
  children: ReactNode;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
} & HTMLAttributes<HTMLElement>) {
  return (
    <Component className={cn('sr-only', className)} {...rest}>
      {children}
    </Component>
  );
}
