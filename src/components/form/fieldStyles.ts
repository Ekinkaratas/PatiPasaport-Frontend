import { cn } from '@/lib/cn';

export function inputClasses(invalid: boolean, className?: string): string {
  return cn(
    'block h-12 w-full rounded-xl bg-white px-4 text-base text-cocoa-900 ring-1 transition',
    'placeholder:text-cocoa-400 focus:outline-none focus:ring-2',
    'disabled:cursor-not-allowed disabled:bg-cream-100 disabled:text-cocoa-500',
    invalid
      ? 'ring-coral-500 focus:ring-coral-500'
      : 'ring-cream-300 hover:ring-cocoa-400 focus:ring-brand-500',
    className,
  );
}

export function describedBy(
  ...ids: Array<string | false | null | undefined>
): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}
