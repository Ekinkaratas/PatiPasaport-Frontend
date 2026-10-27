import { cn } from '@/lib/cn';

export function segmentedRailClasses(className?: string): string {
  return cn('inline-flex gap-2 rounded-xl bg-surface-2 p-1', className);
}

export function segmentedButtonClasses(active: boolean): string {
  return cn(
    'grid min-h-11 min-w-11 place-items-center rounded-[0.625rem] px-2 transition-colors duration-150',
    active
      ? 'bg-surface text-fg shadow-soft dark:bg-line'
      : 'text-fg-muted hover:text-fg',
  );
}
