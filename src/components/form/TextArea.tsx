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
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
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
          'block w-full rounded-xl bg-white px-4 py-3 text-base text-cocoa-900 ring-1 transition',
          'placeholder:text-cocoa-400 focus:outline-none focus:ring-2',
          error
            ? 'ring-coral-500 focus:ring-coral-500'
            : 'ring-cream-300 hover:ring-cocoa-400 focus:ring-brand-500',
        )}
        {...props}
      />
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
