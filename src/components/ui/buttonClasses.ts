import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary:
    'bg-transparent text-fg ring-[1.5px] ring-input ring-inset hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-on-danger hover:bg-danger/90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm gap-1.5',
  md: 'min-h-12 px-5 py-2.5 text-base gap-2',
  lg: 'min-h-14 px-7 py-3 text-lg gap-2.5',
};

/** `<a>`/`<Link>` gibi buton görünümlü öğeler için de kullanılabilir. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-bold transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
