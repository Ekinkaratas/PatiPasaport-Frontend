import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';
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
  critical = false,
  failed = false,
}: {
  label: string;
  value: number | string | undefined;
  to: string;
  critical?: boolean;
  failed?: boolean;
}) {
  const { t } = useTranslation();
  const pending = value === undefined && !failed;
  const alarming = critical && typeof value === 'number' && value > 0;
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl bg-surface p-5 shadow-soft light:ring-1 light:ring-line"
    >
      <span
        aria-busy={pending || undefined}
        className={cn(
          'block text-3xl font-extrabold tabular-nums',
          value === undefined
            ? 'text-fg-muted'
            : alarming
              ? 'text-danger'
              : 'text-accent-fg',
        )}
      >
        {value ?? (failed ? '—' : '…')}
      </span>
      <span className="mt-1 block text-sm font-semibold text-fg-muted underline-offset-4 group-hover:text-fg group-hover:underline">
        {label}
      </span>
      {failed && value === undefined && (
        <span className="mt-1 block text-sm font-bold text-danger">
          {t('loadFailed')}
        </span>
      )}
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
        />
        <Stat
          label={t('overview.belowCritical')}
          value={critical.data?.total}
          failed={critical.isError}
          to="/clinic/stock?critical=1"
          critical
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
        />
        <Stat
          label={t('overview.pendingDrafts')}
          value={drafts.data?.total}
          failed={drafts.isError}
          to="/clinic/drafts"
        />
      </div>
      <ClinicCodeCard clinicId={clinic.id} />
    </div>
  );
}
