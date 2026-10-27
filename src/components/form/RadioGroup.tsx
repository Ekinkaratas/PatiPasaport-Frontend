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
      <legend className="mb-1.5 text-sm font-semibold text-fg">{label}</legend>
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
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-semibold transition-colors',
                checked
                  ? 'border-accent bg-accent-tint text-accent-strong'
                  : error
                    ? 'border-danger bg-surface text-fg dark:bg-bg'
                    : 'border-input bg-surface text-fg dark:bg-bg',
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
                className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-input bg-surface transition-colors checked:border-accent checked:bg-accent-ink checked:ring-[5px] checked:ring-accent checked:ring-inset disabled:cursor-not-allowed dark:bg-bg"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-fg-muted">
          {hint}
        </p>
      )}
    </fieldset>
  );
}
