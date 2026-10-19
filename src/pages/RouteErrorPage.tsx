import { isRouteErrorResponse, useRouteError } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { Button } from '@/components/ui/Button';
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
      <section className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center sm:px-6">
        <PawIcon className="size-16 text-brand-300" />
        <h1 className="mt-6 text-3xl font-extrabold text-cocoa-900">
          {t('routeError.updatedTitle')}
        </h1>
        <p className="mt-3 text-cocoa-600">{t('routeError.updatedBody')}</p>
        <Button className="mt-8" onClick={() => window.location.reload()}>
          {t('actions.reload')}
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <PawIcon className="size-16 text-coral-500/60" />
      <h1 className="mt-6 text-3xl font-extrabold text-cocoa-900">
        {t('routeError.title')}
      </h1>
      <p className="mt-3 text-cocoa-600">{t('routeError.body')}</p>
      <a href="/" className={buttonClasses('primary', 'md', 'mt-8')}>
        {t('actions.backHome')}
      </a>
    </section>
  );
}
