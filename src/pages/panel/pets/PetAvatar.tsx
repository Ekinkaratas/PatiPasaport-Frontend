import { PawIcon } from '@/components/ui/PawIcon';
import { cn } from '@/lib/cn';

const SPECIES_COLORS: Record<string, string> = {
  DOG: 'bg-brand-100 text-brand-600',
  CAT: 'bg-sage-100 text-sage-600',
  BIRD: 'bg-coral-100 text-coral-600',
  RABBIT: 'bg-cream-200 text-cocoa-500',
  HAMSTER: 'bg-brand-50 text-brand-500',
  GUINEA_PIG: 'bg-sage-50 text-sage-500',
  FERRET: 'bg-cream-300 text-cocoa-600',
  TURTLE: 'bg-sage-100 text-sage-700',
};

export function PetAvatar({
  species,
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
        SPECIES_COLORS[species] ?? 'bg-cream-200 text-cocoa-500',
        size === 'lg' ? 'size-20' : 'size-14',
      )}
    >
      <PawIcon className={size === 'lg' ? 'size-12' : 'size-8'} />
    </span>
  );
}
