import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { PawIcon } from '@/components/ui/PawIcon';

export function PetNotFound() {
  const { t } = useTranslation('pets');
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-cream-300/60">
      <PawIcon className="size-14 text-cream-300" />
      <h1 className="mt-5 text-xl font-extrabold text-cocoa-900">
        {t('detail.notFoundTitle')}
      </h1>
      <p className="mt-2 text-cocoa-600">{t('detail.notFoundBody')}</p>
      <Link
        to="/panel/pets"
        className={buttonClasses('secondary', 'md', 'mt-6')}
      >
        {t('detail.back')}
      </Link>
    </div>
  );
}
