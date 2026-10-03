import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `raised` lifts the surface; `plain` keeps it flat for dense tables. */
  variant?: 'default' | 'raised' | 'plain' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const VARIANTS = {
  default: 'bg-surface border border-border shadow-sm',
  raised: 'bg-elevated border border-border shadow-md',
  plain: 'bg-surface border border-border',
  interactive:
    'bg-surface border border-border shadow-sm transition-all duration-normal ease-soft hover:border-border-strong hover:shadow-md hover:-translate-y-0.5',
} as const;

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6 md:p-7',
} as const;

/** Layered surface primitive used by every panel, card and stat tile. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', padding = 'md', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn('rounded-xl', VARIANTS[variant], PADDING[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
