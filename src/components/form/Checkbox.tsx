import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CheckIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'id'
> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}

export function Checkbox({
  label,
  hint,
  error,
  className,
  ...props
}: CheckboxProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'peer size-5 cursor-pointer appearance-none rounded-md border-[1.5px] bg-surface transition-colors dark:bg-bg',
              'checked:border-accent checked:bg-accent',
              error ? 'border-danger' : 'border-input',
            )}
            {...props}
          />
          <CheckIcon className="pointer-events-none absolute size-3.5 text-accent-ink opacity-0 peer-checked:opacity-100" />
        </span>
        <label
          htmlFor={id}
          className="cursor-pointer text-sm leading-6 text-fg"
        >
          {label}
        </label>
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1.5 pl-8 text-sm font-semibold text-danger"
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 pl-8 text-sm text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
