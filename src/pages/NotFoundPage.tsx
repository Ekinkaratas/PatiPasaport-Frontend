import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Card } from '@/components/ui/Card';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 sm:px-6 sm:py-24">
      <Card className="w-full p-8 text-center sm:p-10">
        <p className="text-6xl leading-none font-extrabold tracking-[-0.03em] text-accent-fg">
          404
        </p>
        <h1 className="mt-5 text-3xl text-balance text-fg">
          {t('notFound.title')}
        </h1>
        <p className="mt-3 text-fg-muted">{t('notFound.body')}</p>
        <Link to="/" className={buttonClasses('primary', 'md', 'mt-8')}>
          {t('actions.backHome')}
        </Link>
      </Card>
    </section>
  );
}
