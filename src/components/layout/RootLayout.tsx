import { Outlet, ScrollRestoration } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DemoBanner } from './DemoBanner';
import { FlashBanner } from './FlashBanner';
import { Footer } from './Footer';
import { NavigationProgress } from './NavigationProgress';
import { Header } from './Header';

export function RootLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col">
      <NavigationProgress />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2.5 focus:font-bold focus:text-fg focus:shadow-soft"
      >
        {t('skipToContent')}
      </a>
      <DemoBanner />
      <Header />
      <FlashBanner />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
