import { cn } from '@/lib/cn';
import { PawIcon } from './PawIcon';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-brand-50 shadow-sm">
        <PawIcon className="size-7" />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-cocoa-800">
        Pati<span className="text-brand-600">Pasaport</span>
      </span>
    </span>
  );
}
