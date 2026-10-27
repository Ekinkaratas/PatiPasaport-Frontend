import { cn } from '@/lib/cn';

export function inputClasses(invalid: boolean, className?: string): string {
  return cn(
    'block h-12 w-full rounded-xl border-[1.5px] bg-surface px-4 text-base text-fg transition-colors dark:bg-bg',
    'placeholder:text-fg-muted',
    'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-muted',
    invalid ? 'border-danger' : 'border-input',
    className,
  );
}

export function describedBy(
  ...ids: Array<string | false | null | undefined>
): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}
