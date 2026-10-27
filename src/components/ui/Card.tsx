import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line',
        className,
      )}
      {...props}
    />
  );
}
