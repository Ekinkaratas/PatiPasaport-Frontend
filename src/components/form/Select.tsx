import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { describedBy, inputClasses } from './fieldStyles';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id'
> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string | null;
  hint?: ReactNode;
}

export function Select({
  label,
  options,
  placeholder,
  error,
  hint,
  className,
  ...props
}: SelectProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            error ? errorId : null,
            hint ? hintId : null,
          )}
          className={inputClasses(Boolean(error), 'appearance-none pr-10')}
          {...props}
        >
          {placeholder !== undefined && (
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
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-cocoa-500"
        >
          <path
            d="M5.5 7.5 10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
