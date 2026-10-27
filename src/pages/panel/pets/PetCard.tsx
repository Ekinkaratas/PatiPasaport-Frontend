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
      className="group flex h-full flex-col rounded-2xl bg-surface p-5 shadow-soft light:ring-1 light:ring-line"
    >
      <div className="flex items-center gap-4">
        <PetAvatar species={pet.species} />
        <div className="min-w-0">
          <p className="text-lg font-extrabold wrap-break-word text-fg underline-offset-4 group-hover:underline">
            {pet.name}
          </p>
          <p className="text-sm wrap-break-word text-fg-muted">
            {labels.breed(pet.breed)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{labels.species(pet.species)}</Badge>
        <Badge>{labels.sex(pet.sex)}</Badge>
        <Badge>{age ?? t('card.ageUnknown')}</Badge>
        {pet.isNeutered && <Badge tone="sage">{t('card.neutered')}</Badge>}
      </div>
      <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-fg-muted tabular-nums">
        <LockIcon className="size-4 shrink-0" />
        {pet.chipNumberMasked || t('card.noChip')}
      </p>
    </Link>
  );
}
