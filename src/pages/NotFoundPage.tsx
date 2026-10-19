import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { PawIcon } from '@/components/ui/PawIcon';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <PawIcon className="size-16 text-brand-300" />
      <p className="mt-6 text-sm font-bold tracking-widest text-brand-700">
        404
      </p>
      <h1 className="mt-2 text-3xl font-extrabold text-cocoa-900">
        {t('notFound.title')}
      </h1>
      <p className="mt-3 text-cocoa-600">{t('notFound.body')}</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-8')}>
        {t('actions.backHome')}
      </Link>
    </section>
  );
}
