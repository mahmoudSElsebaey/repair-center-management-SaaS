import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

/**
 * Language switch.
 *
 * A single control that flips the entire document between Arabic (RTL) and
 * English (LTR) — copy, direction, alignment, icon mirroring and fonts.
 */
export function LanguageToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const { t } = useTranslation();
  const { locale, toggle } = useLanguage();

  const nextLabel = locale === 'ar' ? t('language.english') : t('language.arabic');
  const currentLabel = locale === 'ar' ? t('language.arabic') : t('language.english');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${t('language.switch')} — ${nextLabel}`}
      title={`${t('language.switch')} — ${nextLabel}`}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-lg',
        'border border-border bg-surface text-foreground-muted',
        'transition-colors duration-fast ease-soft hover:bg-surface-hover hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
        withLabel ? 'px-3' : 'w-9',
        className
      )}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      {withLabel && (
        <span className="text-sm font-medium text-foreground" dir="auto">
          {currentLabel}
        </span>
      )}
    </button>
  );
}
