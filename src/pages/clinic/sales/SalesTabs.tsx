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
      <ul className="inline-flex gap-1 rounded-full bg-cream-200 p-1">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'block rounded-full px-4 py-2 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-white text-cocoa-900 shadow-sm'
                    : 'text-cocoa-600 hover:text-cocoa-900',
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
