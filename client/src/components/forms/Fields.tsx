import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  /** Rendered as a disabled first option when no value is chosen yet. */
  placeholder?: string;
  selectSize?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-sm',
  lg: 'h-12 text-base',
} as const;

/** Labelled native select — native so the OS picker and keyboard behaviour work. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, hint, error, options, placeholder, selectSize = 'md', id, required, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const describedById = `${selectId}-description`;
  const hasError = Boolean(error);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hint || error ? describedById : undefined}
        className={cn(
          'w-full rounded-lg border bg-surface-sunken px-3.5 text-foreground',
          'transition-[border-color,box-shadow] duration-fast ease-soft',
          'hover:border-border-strong',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45',
          'disabled:cursor-not-allowed disabled:opacity-60',
          SIZE_CLASSES[selectSize],
          hasError ? 'border-danger' : 'border-border'
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {(hint || error) && (
        <p
          id={describedById}
          role={hasError ? 'alert' : undefined}
          className={cn('mt-1.5 text-xs', hasError ? 'text-danger' : 'text-foreground-subtle')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, hint, error, id, required, rows = 3, ...props },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? `textarea-${generatedId}`;
  const describedById = `${textareaId}-description`;
  const hasError = Boolean(error);

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground"
        >
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hint || error ? describedById : undefined}
        className={cn(
          'w-full rounded-lg border bg-surface-sunken px-3.5 py-2.5 text-sm text-foreground',
          'placeholder:text-foreground-subtle',
          'transition-[border-color,box-shadow] duration-fast ease-soft',
          'hover:border-border-strong',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/45',
          'disabled:cursor-not-allowed disabled:opacity-60',
          hasError ? 'border-danger' : 'border-border'
        )}
        {...props}
      />

      {(hint || error) && (
        <p
          id={describedById}
          role={hasError ? 'alert' : undefined}
          className={cn('mt-1.5 text-xs', hasError ? 'text-danger' : 'text-foreground-subtle')}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});
