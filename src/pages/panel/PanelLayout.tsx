import { Navigate, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/auth/hooks';
import { AccountLoadError } from '@/components/layout/AccountLoadError';
import { PanelShell, SideNav } from '@/components/layout/SideNav';
import { HomeIcon, ShieldIcon, UserIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PawIcon } from '@/components/ui/PawIcon';
import type { OwnerContext } from './ownerContext';

export function PanelLayout() {
  const { t } = useTranslation('panel');
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
  if (account.kind === 'clinic') return <Navigate to="/clinic" replace />;

  const context: OwnerContext = { profile: account.profile };

  return (
    <PanelShell
      nav={
        <SideNav
          label={t('nav.label')}
          items={[
            {
              to: '/panel',
              label: t('nav.overview'),
              icon: HomeIcon,
              end: true,
            },
            { to: '/panel/pets', label: t('nav.pets'), icon: PawIcon },
            {
              to: '/panel/consents',
              label: t('nav.consents'),
              icon: ShieldIcon,
            },
            { to: '/panel/profile', label: t('nav.profile'), icon: UserIcon },
          ]}
        />
      }
    >
      <Outlet context={context} />
    </PanelShell>
  );
}
