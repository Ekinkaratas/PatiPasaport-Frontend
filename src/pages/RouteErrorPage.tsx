import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PawIcon } from '@/components/ui/PawIcon';
import { isChunkLoadError } from '@/lib/chunkError';
import { NotFoundPage } from './NotFoundPage';

//Router hata sınırı.
export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  if (isChunkLoadError(error)) {
    return (
      <section className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Card className="w-full p-8 text-center sm:p-10">
          <PawIcon className="mx-auto size-12 text-fg-muted" />
          <h1 className="mt-5 text-3xl text-balance text-accent-fg">
            {t('routeError.updatedTitle')}
          </h1>
          <p className="mt-3 text-fg-muted">{t('routeError.updatedBody')}</p>
          <Button className="mt-8" onClick={() => window.location.reload()}>
            {t('actions.reload')}
          </Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full p-8 text-center sm:p-10">
        <PawIcon className="mx-auto size-12 text-danger" />
        <h1 className="mt-5 text-3xl text-balance text-accent-fg">
          {t('routeError.title')}
        </h1>
        <p className="mt-3 text-fg-muted">{t('routeError.body')}</p>
        <a href="/" className={buttonClasses('primary', 'md', 'mt-8')}>
          {t('actions.backHome')}
        </a>
      </Card>
    </section>
  );
}
