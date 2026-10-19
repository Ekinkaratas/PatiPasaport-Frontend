import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'bg-white text-cocoa-800 ring-1 ring-cream-300 hover:bg-cream-200 active:bg-cream-300',
  ghost: 'text-cocoa-700 hover:bg-cream-200 active:bg-cream-300',
  danger:
    'bg-coral-600 text-white shadow-sm hover:bg-coral-700 active:bg-coral-700',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-base gap-2',
  lg: 'h-13 px-7 text-lg gap-2.5',
};

/** `<a>`/`<Link>` gibi buton görünümlü öğeler için de kullanılabilir. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-full font-bold transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
