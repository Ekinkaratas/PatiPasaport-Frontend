import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const TABS = [
  { to: '/clinic/sales', key: 'report', end: true },
  { to: '/clinic/sales/history', key: 'history', end: false },
] as const;

export function SalesTabs() {
  const { t } = useTranslation('clinic');
  return (
    <nav aria-label={t('sales.tabsLabel')}>
      <ul className="inline-flex gap-2 rounded-xl bg-surface-2 p-1">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center rounded-[0.625rem] px-4 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-surface text-fg shadow-soft dark:bg-line'
                    : 'text-fg-muted hover:text-fg',
                )
              }
            >
              {tab.key === 'report'
                ? t('sales.reportTab')
                : t('sales.historyTab')}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
