import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { safeRedirectPath } from './hooks';
import { initSession, LOGOUT_REASON } from './session';
import { useSession } from './useSession';

function PageSpinner() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="flex min-h-[50dvh] items-center justify-center gap-3 text-cocoa-500"
    >
      <Spinner />
      <span>{t('loading')}</span>
    </div>
  );
}

function SessionUnreachable() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <Card className="text-center">
        <h1 className="text-xl font-extrabold text-cocoa-900">
          {t('sessionUnreachable.title')}
        </h1>
        <p className="mt-2 text-cocoa-600">{t('sessionUnreachable.body')}</p>
        <Button className="mt-6" onClick={() => void initSession()}>
          {t('actions.retry')}
        </Button>
      </Card>
    </div>
  );
}

/** Oturum gerektiren sayfalar. Giriş yoksa giriş sayfasına, dönüş adresiyle. */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  if (session.status === 'initializing') return <PageSpinner />;
  if (session.status === 'unreachable') return <SessionUnreachable />;
  if (session.status === 'anonymous') {
    if (session.endReason === LOGOUT_REASON) return <Navigate to="/" replace />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

/** Giriş / kayıt sayfaları: zaten giriş yapılmışsa panele yönlendirir. */
export function GuestOnly() {
  const session = useSession();
  const [searchParams] = useSearchParams();
  if (session.status === 'initializing') return <PageSpinner />;
  if (session.status === 'authenticated') {
    return <Navigate to={safeRedirectPath(searchParams.get('next'))} replace />;
  }
  return <Outlet />;
}

/** Oturum kapandığında (çıkış, başka sekme, sunucu iptali) önbelleği temizler. */
export function SessionCacheGuard() {
  const queryClient = useQueryClient();
  const { status } = useSession();

  useEffect(() => {
    if (status === 'anonymous') queryClient.clear();
  }, [status, queryClient]);

  return null;
}
