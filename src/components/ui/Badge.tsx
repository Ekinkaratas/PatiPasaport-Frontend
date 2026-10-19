import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'sage' | 'neutral' | 'coral';

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-800',
  sage: 'bg-sage-100 text-sage-700',
  neutral: 'bg-cream-200 text-cocoa-600',
  coral: 'bg-coral-100 text-coral-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
