import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { describedBy } from './fieldStyles';

export interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id'
> {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

export function TextArea({
  label,
  error,
  hint,
  className,
  rows = 4,
  ...props
}: TextAreaProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-fg"
      >
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          error ? errorId : null,
          hint ? hintId : null,
        )}
        className={cn(
          'block w-full rounded-xl border-[1.5px] bg-surface px-4 py-3 text-base text-fg transition-colors dark:bg-bg',
          'placeholder:text-fg-muted',
          'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-muted',
          error ? 'border-danger' : 'border-input',
        )}
        {...props}
      />
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
    </div>
  );
}
