import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { describedBy, inputClasses } from './fieldStyles';

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id'
> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export function TextField({
  label,
  error,
  hint,
  trailing,
  invalid = false,
  className,
  ...props
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error || invalid ? true : undefined}
          aria-describedby={describedBy(
            error ? errorId : null,
            hint ? hintId : null,
          )}
          className={inputClasses(
            Boolean(error) || invalid,
            trailing ? 'pr-12' : undefined,
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {trailing}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-coral-600">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-cocoa-500">
          {hint}
        </p>
      )}
    </div>
  );
}
