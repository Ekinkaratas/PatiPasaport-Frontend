import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { PlusIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { PawIcon } from '@/components/ui/PawIcon';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { PetCard } from './PetCard';
import { usePets } from './queries';

export function EmptyPets() {
  const { t } = useTranslation('pets');
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-cream-300/60">
      <span className="grid size-16 place-items-center rounded-2xl bg-brand-100 text-brand-500">
        <PawIcon className="size-10" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-cocoa-900">
        {t('list.emptyTitle')}
      </h2>
      <p className="mt-2 max-w-sm text-cocoa-600">{t('list.emptyBody')}</p>
      <Link
        to="/panel/pets/new"
        className={buttonClasses('primary', 'md', 'mt-6')}
      >
        <PlusIcon className="size-5" />
        {t('list.emptyCta')}
      </Link>
    </div>
  );
}

export function PetsPage() {
  const { t } = useTranslation('pets');
  useDocumentTitle(t('list.pageTitle'));
  const pets = usePets();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('list.title')}
        actions={
          pets.data && pets.data.length > 0 ? (
            <Link
              to="/panel/pets/new"
              className={buttonClasses('primary', 'md')}
            >
              <PlusIcon className="size-5" />
              {t('list.add')}
            </Link>
          ) : undefined
        }
      />
      {pets.isPending && <LoadingBlock />}
      {pets.isError && <ErrorAlert error={pets.error} />}
      {pets.isSuccess &&
        (pets.data.length === 0 ? (
          <EmptyPets />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pets.data.map((pet) => (
              <li key={pet.id}>
                <PetCard pet={pet} />
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
