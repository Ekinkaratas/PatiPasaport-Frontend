import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { PawIcon } from '@/components/ui/PawIcon';

export function PetNotFound() {
  const { t } = useTranslation('pets');
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
      <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
        <PawIcon className="size-9" />
      </span>
      <h1 className="mt-5 text-xl font-extrabold text-fg">
        {t('detail.notFoundTitle')}
      </h1>
      <p className="mt-2 max-w-sm text-fg-muted">{t('detail.notFoundBody')}</p>
      <Link
        to="/panel/pets"
        className={buttonClasses('secondary', 'md', 'mt-6')}
      >
        {t('detail.back')}
      </Link>
    </div>
  );
}
