import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60',
        className,
      )}
      {...props}
    />
  );
}
