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
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
        <PawIcon className="size-9" />
      </span>
      <h2 className="mt-5 text-xl font-extrabold text-fg">
        {t('list.emptyTitle')}
      </h2>
      <p className="mt-2 max-w-sm text-fg-muted">{t('list.emptyBody')}</p>
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
