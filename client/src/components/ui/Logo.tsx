import { cn } from '@/lib/utils';

const BRAND_LOGO_SRC = '/brand/fixer-logo.png';
const BRAND_MARK_SRC = '/brand/fixer-mark.svg';

const MARK_SIZES = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-12 w-12',
} as const;

const LOGO_SIZES = {
  sm: 'h-7 w-auto',
  md: 'h-9 w-auto',
  lg: 'h-12 w-auto',
} as const;

const LOGO_MAX_WIDTHS = {
  sm: 'max-w-[112px]',
  md: 'max-w-[144px]',
  lg: 'max-w-[184px]',
} as const;

export interface LogoProps {
  /** `full` shows the uploaded Fixer wordmark; `mark` shows the compact symbol. */
  variant?: 'full' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Rendered below the wordmark, e.g. the product tagline. */
  suffix?: string;
}

export function Logo({ variant = 'full', size = 'md', className, suffix }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {variant === 'mark' ? (
        <img
          src={BRAND_MARK_SRC}
          alt="Fixer"
          className={cn('block shrink-0 object-contain', MARK_SIZES[size])}
          width={48}
          height={48}
        />
      ) : (
        <span className="flex min-w-0 flex-col leading-none">
          <img
            src={BRAND_LOGO_SRC}
            alt="Fixer"
            className={cn(
              'block shrink-0 object-contain object-left',
              LOGO_SIZES[size],
              LOGO_MAX_WIDTHS[size]
            )}
            width={184}
            height={48}
          />
          {suffix && (
            <span className="mt-1 truncate text-2xs font-medium uppercase tracking-widest text-foreground-subtle">
              {suffix}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
