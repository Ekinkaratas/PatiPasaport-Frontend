import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PlusIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useOwnerProfile } from './ownerContext';
import { PetCard } from './pets/PetCard';
import { EmptyPets } from './pets/PetsPage';
import { usePets } from './pets/queries';
import { UpcomingVaccinations } from './UpcomingVaccinations';

const PREVIEW_COUNT = 4;

export function OverviewPage() {
  const { t } = useTranslation('panel');
  useDocumentTitle(t('overview.pageTitle'));
  const profile = useOwnerProfile();
  const pets = usePets();

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('overview.greeting', { name: profile.fullName })}
        lead={t('overview.lead')}
        actions={
          <Link to="/panel/pets/new" className={buttonClasses('primary', 'md')}>
            <PlusIcon className="size-5" />
            {t('overview.addPet')}
          </Link>
        }
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-extrabold text-fg">
            {t('overview.petsTitle')}
            {pets.isSuccess && pets.data.length > 0 && (
              <Badge>
                {t('overview.petCount', { count: pets.data.length })}
              </Badge>
            )}
          </h2>
          {pets.isSuccess && pets.data.length > PREVIEW_COUNT && (
            <Link
              to="/panel/pets"
              className="inline-flex min-h-11 items-center text-sm font-bold text-fg underline underline-offset-4"
            >
              {t('overview.viewAll')}
            </Link>
          )}
        </div>
        {pets.isPending && <LoadingBlock />}
        {pets.isError && <ErrorAlert error={pets.error} />}
        {pets.isSuccess &&
          (pets.data.length === 0 ? (
            <EmptyPets />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {pets.data.slice(0, PREVIEW_COUNT).map((pet) => (
                <li key={pet.id}>
                  <PetCard pet={pet} />
                </li>
              ))}
            </ul>
          ))}
      </section>

      {pets.isSuccess && pets.data.length > 0 && (
        <UpcomingVaccinations pets={pets.data} />
      )}
    </div>
  );
}
