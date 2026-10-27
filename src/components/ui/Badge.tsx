import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'brand' | 'sage' | 'neutral' | 'coral';

const TONES: Record<Tone, string> = {
  brand: 'bg-accent-tint text-accent-strong',
  sage: 'bg-ok-tint text-ok',
  neutral: 'bg-surface-2 text-fg-muted',
  coral: 'bg-danger-tint text-danger',
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
        'inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[0.8125rem] leading-5 font-bold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
