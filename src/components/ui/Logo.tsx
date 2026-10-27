import { cn } from '@/lib/cn';
import { PawIcon } from './PawIcon';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-[0.625rem] bg-accent text-accent-ink">
        <PawIcon className="size-6" />
      </span>
      <span className="text-lg font-extrabold tracking-[-0.03em] text-fg">
        PatiPasaport
      </span>
    </span>
  );
}
