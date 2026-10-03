import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  /** Validation or helper message rendered below the field. */
  hint?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-sm',
  lg: 'h-12 text-base',
} as const;

/**
 * Text input with an integrated label, hint and error slot.
 *
 * Accessibility notes: the label is always associated, errors are announced via
 * `aria-describedby` and `aria-invalid`, and the password toggle is a real
 * button with an accessible name rather than an icon-only div.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    inputSize = 'md',
    id,
    type = 'text',
    required,
    disabled,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const describedById = `${inputId}-description`;
  const isPassword = type === 'password';
  const [revealed, setRevealed] = useState(false);

  const hasError = Boolean(error);
  const resolvedType = isPassword && revealed ? 'text' : type;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
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

      <div className="relative">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute inset-y-0 start-0 flex w-11 items-center justify-center text-foreground-subtle"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={hint || error ? describedById : undefined}
          className={cn(
            'w-full rounded-lg border bg-surface-sunken px-3.5 text-foreground',
            'placeholder:text-foreground-subtle',
            'transition-[border-color,box-shadow,background-color] duration-fast ease-soft',
            'hover:border-border-strong',
            'focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-60',
            SIZE_CLASSES[inputSize],
            leadingIcon ? 'ps-11' : undefined,
            trailingIcon || isPassword ? 'pe-11' : undefined,
            hasError ? 'border-danger focus:ring-danger/40 focus:border-danger' : 'border-border',
            'autofill:bg-surface-sunken'
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
            className={cn(
              'absolute inset-y-0 end-0 flex w-11 items-center justify-center',
              'text-foreground-subtle transition-colors duration-fast hover:text-foreground',
              'focus-visible:outline-none focus-visible:text-foreground'
            )}
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          trailingIcon && (
            <span
              className="pointer-events-none absolute inset-y-0 end-0 flex w-11 items-center justify-center text-foreground-subtle"
              aria-hidden="true"
            >
              {trailingIcon}
            </span>
          )
        )}
      </div>

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
