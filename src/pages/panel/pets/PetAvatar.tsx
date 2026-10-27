import { PawIcon } from '@/components/ui/PawIcon';
import { cn } from '@/lib/cn';

export function PetAvatar({
  size = 'md',
}: {
  species: string;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-2xl',
        size === 'lg'
          ? 'size-20 bg-accent text-accent-ink'
          : 'size-14 bg-accent-tint text-accent-strong',
      )}
    >
      <PawIcon className={size === 'lg' ? 'size-10' : 'size-7'} />
    </span>
  );
}
