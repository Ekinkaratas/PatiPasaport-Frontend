import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { StockSale } from '@/api/types';
import { TextField } from '@/components/form/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { CartIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { translateError } from '@/i18n/translateError';
import { cn } from '@/lib/cn';
import {
  formatDateTime,
  formatMoney,
  todayInBusinessTimeZone,
} from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { Honeypot } from '@/security/Honeypot';
import { BOT_BLOCKED_CODE, useBotGuard } from '@/security/useBotGuard';
import { useClinicAccount } from '../clinicContext';
import { SALES_PAGE_SIZE, useStockSales } from '../queries';
import { CancelSaleModal } from './CancelSaleModal';
import {
  canCancelSale,
  isCancelled,
  readSalesFilters,
  validateSalesRange,
  writeSalesFilters,
  type SalesFilters,
} from './salesModel';
import { SalesTabs } from './SalesTabs';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

function RangeForm({
  initial,
  onApply,
}: {
  initial: SalesFilters;
  onApply: (filters: SalesFilters) => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const today = todayInBusinessTimeZone();
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const botGuard = useBotGuard();
  const [blocked, setBlocked] = useState(false);
  const filtered = Boolean(initial.fromDate || initial.toDate);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateSalesRange(fromDate, toDate);
    setRangeError(error);
    if (error) return;
    if (botGuard.isLikelyBot()) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    onApply({ fromDate, toDate, page: 1 });
  };

  const clear = () => {
    setFromDate('');
    setToDate('');
    setRangeError(null);
    onApply({ fromDate: '', toDate: '', page: 1 });
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      role="search"
      className="space-y-4 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line"
    >
      <Honeypot {...botGuard.honeypot} />
      {blocked && <ErrorAlert error={BOT_BLOCKED_CODE} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t('salesHistory.fromDate')}
          name="fromDate"
          type="date"
          max={today}
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setRangeError(null);
          }}
        />
        <TextField
          label={t('salesHistory.toDate')}
          name="toDate"
          type="date"
          max={today}
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setRangeError(null);
          }}
          error={rangeError ? translateError(rangeError, i18n) : null}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {filtered && (
          <Button variant="ghost" onClick={clear}>
            {t('salesHistory.clear')}
          </Button>
        )}
        <Button type="submit">{t('salesHistory.apply')}</Button>
      </div>
    </form>
  );
}

function SaleRow({
  sale,
  onCancel,
}: {
  sale: StockSale;
  onCancel: (sale: StockSale) => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const money = (kurus: number) => formatMoney(kurus, i18n.language);
  const cancelled = isCancelled(sale);
  const unit = translate(`enums:stockUnit.${sale.unit}`);
  const struck = cancelled ? 'text-fg-muted line-through' : 'text-fg';

  return (
    <li
      className={cn(
        'grid gap-4 rounded-2xl p-5 sm:grid-cols-[1fr_auto] sm:items-center',
        cancelled
          ? 'bg-bg ring-1 ring-line'
          : 'bg-surface shadow-soft light:ring-1 light:ring-line',
      )}
    >
      <div className="min-w-0">
        <p className="wrap-break-word text-lg font-extrabold text-fg">
          {sale.itemName}
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          {formatDateTime(sale.soldAt, i18n.language)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{translate(`enums:stockCategory.${sale.category}`)}</Badge>
          {cancelled && (
            <Badge tone="coral">
              {t('salesHistory.cancelledAt', {
                date: formatDateTime(sale.cancelledAt, i18n.language),
              })}
            </Badge>
          )}
          {!sale.stockItemId && <Badge>{t('sales.deletedItem')}</Badge>}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-4 text-sm sm:text-right">
        <div>
          <dt className="text-fg-muted">{t('salesHistory.quantity')}</dt>
          <dd className={cn('font-bold tabular-nums', struck)}>
            {sale.quantity} {unit}
            <span className="block text-sm font-semibold text-fg-muted">
              × {money(sale.unitSalePrice)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('salesHistory.total')}</dt>
          <dd className={cn('text-lg font-extrabold tabular-nums', struck)}>
            {money(sale.totalSale)}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('salesHistory.profit')}</dt>
          <dd
            className={cn(
              'text-lg font-extrabold tabular-nums',
              cancelled ? struck : sale.profit < 0 ? 'text-danger' : 'text-ok',
            )}
          >
            {money(sale.profit)}
          </dd>
        </div>
      </dl>
      {canCancelSale(sale) && (
        <div className="flex justify-end border-t border-line pt-3 sm:col-span-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger! hover:text-danger!"
            aria-label={t('salesHistory.cancelLabel', { name: sale.itemName })}
            onClick={() => onCancel(sale)}
          >
            {t('salesHistory.cancel')}
          </Button>
        </div>
      )}
    </li>
  );
}

export function SalesHistoryPage() {
  const { t } = useTranslation('clinic');
  useDocumentTitle(t('salesHistory.pageTitle'));
  const clinic = useClinicAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readSalesFilters(searchParams);
  const [cancelling, setCancelling] = useState<StockSale | null>(null);
  const sales = useStockSales(clinic.id, {
    page: filters.page,
    pageSize: SALES_PAGE_SIZE,
    fromDate: filters.fromDate || undefined,
    toDate: filters.toDate || undefined,
  });
  const filtered = Boolean(filters.fromDate || filters.toDate);
  const pageCount = sales.isSuccess
    ? pageCountOf(sales.data.total, SALES_PAGE_SIZE)
    : 0;

  if (sales.isSuccess && pageCount > 0 && filters.page > pageCount) {
    return (
      <Navigate
        replace
        to={{
          search: writeSalesFilters({ ...filters, page: pageCount }).toString(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('sales.title')} lead={t('sales.lead')} />
      <SalesTabs />
      <RangeForm
        key={`${filters.fromDate}|${filters.toDate}`}
        initial={filters}
        onApply={(next) => setSearchParams(writeSalesFilters(next))}
      />
      {sales.isPending && <LoadingBlock />}
      {sales.isError && <ErrorAlert error={sales.error} />}
      {sales.isSuccess &&
        (sales.data.total === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
            <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <CartIcon className="size-9" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-fg">
              {filtered
                ? t('salesHistory.emptyFiltered')
                : t('salesHistory.emptyTitle')}
            </h2>
            {!filtered && (
              <p className="mt-2 text-fg-muted">
                {t('salesHistory.emptyBody')}
              </p>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {sales.data.sales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} onCancel={setCancelling} />
              ))}
            </ul>
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              busy={sales.isFetching}
              onChange={(page) =>
                setSearchParams(writeSalesFilters({ ...filters, page }))
              }
            />
          </>
        ))}
      {cancelling && (
        <CancelSaleModal
          key={cancelling.id}
          clinicId={clinic.id}
          sale={cancelling}
          onClose={() => setCancelling(null)}
        />
      )}
    </div>
  );
}
