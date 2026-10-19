import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { describedBy } from './fieldStyles';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  error?: string | null;
  hint?: ReactNode;
  className?: string;
  columns?: 2 | 3;
}

export function RadioGroup({
  label,
  name,
  value,
  options,
  onChange,
  error,
  hint,
  className,
  columns = 2,
}: RadioGroupProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <fieldset
      className={className}
      aria-describedby={describedBy(
        error ? errorId : null,
        hint ? hintId : null,
      )}
    >
      <legend className="mb-1.5 text-sm font-bold">{label}</legend>
      <div
        className={cn(
          'grid gap-2',
          columns === 3 ? 'sm:grid-cols-3' : 'grid-cols-2',
        )}
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold ring-1 transition',
                checked
                  ? 'bg-brand-50 text-brand-800 ring-2 ring-brand-500'
                  : error
                    ? 'ring-coral-500'
                    : 'ring-cream-300 hover:ring-cocoa-400',
                option.disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                disabled={option.disabled}
                aria-invalid={error ? true : undefined}
                onChange={() => onChange(option.value)}
                className="size-4 accent-brand-500"
              />
              {option.label}
            </label>
          );
        })}
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
    </fieldset>
  );
}
