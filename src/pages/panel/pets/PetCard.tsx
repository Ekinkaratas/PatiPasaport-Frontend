import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Pet } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { LockIcon } from '@/components/ui/icons';
import { PetAvatar } from './PetAvatar';
import { usePetLabels } from './usePetLabels';

export function PetCard({ pet }: { pet: Pet }) {
  const { t } = useTranslation('pets');
  const labels = usePetLabels();
  const age = labels.age(pet);

  return (
    <Link
      to={`/panel/pets/${pet.id}`}
      className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60 transition hover:-translate-y-0.5 hover:ring-brand-300"
    >
      <div className="flex items-center gap-4">
        <PetAvatar species={pet.species} />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-cocoa-900 group-hover:text-brand-700">
            {pet.name}
          </p>
          <p className="truncate text-sm text-cocoa-500">
            {labels.species(pet.species)} · {labels.breed(pet.breed)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{labels.sex(pet.sex)}</Badge>
        <Badge>{age ?? t('card.ageUnknown')}</Badge>
        {pet.isNeutered && <Badge tone="sage">{t('card.neutered')}</Badge>}
      </div>
      <p className="mt-auto flex items-center gap-1.5 pt-4 font-mono text-sm text-cocoa-500">
        <LockIcon className="size-4" />
        {pet.chipNumberMasked || (
          <span className="font-sans">{t('card.noChip')}</span>
        )}
      </p>
    </Link>
  );
}
