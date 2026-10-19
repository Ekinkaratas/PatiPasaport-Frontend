import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function TableScroll({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn('overflow-x-auto', className)}
    >
      {children}
    </div>
  );
}
