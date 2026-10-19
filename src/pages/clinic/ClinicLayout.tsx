import { Navigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/auth/hooks';
import { AccountLoadError } from '@/components/layout/AccountLoadError';
import { PanelShell, SideNav } from '@/components/layout/SideNav';
import {
  BoxIcon,
  BuildingIcon,
  ChartIcon,
  DocumentIcon,
  HomeIcon,
  SearchIcon,
  ShieldIcon,
} from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type { ClinicContext } from './clinicContext';

export function ClinicLayout() {
  const { t } = useTranslation('clinic');
  const account = useAccount();

  if (account.kind === 'loading') return <LoadingBlock />;
  if (account.kind === 'error') {
    return (
      <AccountLoadError
        title={t('loadError')}
        error={account.error}
        onRetry={account.retry}
      />
    );
  }
  if (account.kind === 'owner') return <Navigate to="/panel" replace />;

  const context: ClinicContext = { clinic: account.clinic };

  return (
    <PanelShell
      nav={
        <SideNav
          label={t('nav.label')}
          items={[
            {
              to: '/clinic',
              label: t('nav.overview'),
              icon: HomeIcon,
              end: true,
            },
            {
              to: '/clinic/patients',
              label: t('nav.patients'),
              icon: SearchIcon,
            },
            {
              to: '/clinic/consents',
              label: t('nav.consents'),
              icon: ShieldIcon,
            },
            { to: '/clinic/stock', label: t('nav.stock'), icon: BoxIcon },
            { to: '/clinic/sales', label: t('nav.sales'), icon: ChartIcon },
            {
              to: '/clinic/drafts',
              label: t('nav.drafts'),
              icon: DocumentIcon,
            },
            {
              to: '/clinic/profile',
              label: t('nav.profile'),
              icon: BuildingIcon,
            },
          ]}
        />
      }
    >
      <Outlet context={context} />
    </PanelShell>
  );
}
