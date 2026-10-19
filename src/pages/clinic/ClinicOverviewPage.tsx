import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import {
  BoxIcon,
  ChartIcon,
  DocumentIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
} from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import { formatMoney, monthInBusinessTimeZone } from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { ClinicCodeCard } from './ClinicCodeCard';
import { useClinicAccount } from './clinicContext';
import { DraftReviewStatus } from '@/api/types';
import { useDraftReviews } from '../health/queries';
import { useClinicConsents, useSalesSummary, useStock } from './queries';

function Stat({
  label,
  value,
  to,
  tone,
  icon,
  failed = false,
}: {
  label: string;
  value: number | string | undefined;
  to: string;
  tone: 'sage' | 'coral' | 'brand';
  icon: ReactNode;
  failed?: boolean;
}) {
  const { t } = useTranslation();
  const pending = value === undefined && !failed;
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60 transition hover:ring-brand-300"
    >
      <span
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-xl',
          tone === 'sage'
            ? 'bg-sage-100 text-sage-700'
            : tone === 'brand'
              ? 'bg-brand-100 text-brand-800'
              : 'bg-coral-100 text-coral-700',
        )}
      >
        {icon}
      </span>
      <span>
        <span
          aria-busy={pending || undefined}
          className="block text-3xl font-extrabold text-cocoa-900"
        >
          {value ?? (failed ? '—' : '…')}
        </span>
        <span className="block text-sm font-semibold text-cocoa-500">
          {label}
        </span>
        {failed && value === undefined && (
          <span className="block text-xs font-bold text-coral-700">
            {t('loadFailed')}
          </span>
        )}
      </span>
    </Link>
  );
}

export function ClinicOverviewPage() {
  const { t, i18n } = useTranslation('clinic');
  useDocumentTitle(t('overview.pageTitle'));
  const clinic = useClinicAccount();
  const consents = useClinicConsents(1);
  const critical = useStock(clinic.id, {
    page: 1,
    pageSize: 8,
    onlyBelowCritical: true,
  });
  const sales = useSalesSummary(clinic.id, monthInBusinessTimeZone());
  const drafts = useDraftReviews({
    page: 1,
    pageSize: 8,
    status: DraftReviewStatus.PENDING,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('overview.greeting', { name: clinic.name })}
        lead={t('overview.lead')}
        actions={
          <>
            <Link
              to="/clinic/patients"
              className={buttonClasses('primary', 'md')}
            >
              <SearchIcon className="size-5" />
              {t('overview.searchPatients')}
            </Link>
            <Link
              to="/clinic/stock/new"
              className={buttonClasses('secondary', 'md')}
            >
              <PlusIcon className="size-5" />
              {t('overview.addStock')}
            </Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label={t('overview.activeConsents')}
          value={consents.data?.total}
          failed={consents.isError}
          to="/clinic/consents"
          tone="sage"
          icon={<ShieldIcon className="size-6" />}
        />
        <Stat
          label={t('overview.belowCritical')}
          value={critical.data?.total}
          failed={critical.isError}
          to="/clinic/stock?critical=1"
          tone="coral"
          icon={<BoxIcon className="size-6" />}
        />
        <Stat
          label={t('overview.monthRevenue')}
          value={
            sales.data
              ? formatMoney(sales.data.totals.revenue, i18n.language)
              : undefined
          }
          failed={sales.isError}
          to="/clinic/sales"
          tone="brand"
          icon={<ChartIcon className="size-6" />}
        />
        <Stat
          label={t('overview.pendingDrafts')}
          value={drafts.data?.total}
          failed={drafts.isError}
          to="/clinic/drafts"
          tone="brand"
          icon={<DocumentIcon className="size-6" />}
        />
      </div>
      <ClinicCodeCard clinicId={clinic.id} />
    </div>
  );
}
