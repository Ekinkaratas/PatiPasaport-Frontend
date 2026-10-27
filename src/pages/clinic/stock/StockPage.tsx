import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { adjustStockItem } from '@/api/endpoints/clinics';
import type { StockItem } from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { Select } from '@/components/form/Select';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonClasses';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  BoxIcon,
  CartIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { STOCK_CATEGORIES, type StockCategory } from '@/domain/constants';
import { cn } from '@/lib/cn';
import { formatDate, formatMoney, todayInBusinessTimeZone } from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useClinicAccount } from '../clinicContext';
import { applyStockItemChange, STOCK_PAGE_SIZE, useStock } from '../queries';
import { StockAdjustModal } from './StockAdjustModal';
import { StockDeleteModal } from './StockDeleteModal';
import { StockEditModal } from './StockEditModal';
import { StockSaleModal } from './StockSaleModal';
import {
  canStep,
  expiryState,
  hasPrices,
  readStockFilters,
  writeStockFilters,
  type StockFilters,
} from './stockModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

type StockActionKind = 'sell' | 'adjust' | 'edit' | 'delete';

interface StockAction {
  kind: StockActionKind;
  item: StockItem;
  quantity?: string;
}

function StockRow({
  clinicId,
  item,
  today,
  onAction,
}: {
  clinicId: string;
  item: StockItem;
  today: string;
  onAction: (action: StockAction) => void;
}) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const queryClient = useQueryClient();
  const expiry = expiryState(item, today);
  const priced = hasPrices(item);
  const [sellQuantity, setSellQuantity] = useState('1');
  const sellTooltipId = useId();
  const sellBlockedReason = !priced
    ? t('stock.sellNeedsPrice')
    : item.quantity === 0
      ? t('stock.sellOutOfStock')
      : null;
  const step = useMutation({
    mutationFn: (delta: number) => adjustStockItem(clinicId, item.id, delta),
    onSuccess: ({ item: updated }) => {
      void applyStockItemChange(queryClient, updated, 'updated');
    },
  });

  return (
    <li className="grid gap-4 rounded-2xl bg-surface p-5 shadow-soft light:ring-1 light:ring-line sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-lg font-extrabold wrap-break-word text-fg">
          {item.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{translate(`enums:stockCategory.${item.category}`)}</Badge>
          {item.isBelowCritical && (
            <Badge tone="coral">{t('stock.belowCritical')}</Badge>
          )}
          {expiry === 'expired' && (
            <Badge tone="coral">{t('stock.expired')}</Badge>
          )}
          {expiry === 'soon' && (
            <Badge tone="brand">{t('stock.expiringSoon')}</Badge>
          )}
          {!priced && <Badge tone="brand">{t('stock.noPrice')}</Badge>}
        </div>
        {priced && (
          <p className="mt-2 text-sm text-fg-muted tabular-nums">
            {t('stock.prices', {
              purchase: formatMoney(item.purchasePrice, i18n.language),
              sale: formatMoney(item.salePrice, i18n.language),
            })}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-4 text-sm sm:text-right">
        <div>
          <dt className="text-fg-muted">{t('stock.quantity')}</dt>
          <dd
            aria-live="polite"
            className={cn(
              'text-lg font-extrabold tabular-nums',
              item.isBelowCritical ? 'text-danger' : 'text-fg',
            )}
          >
            {item.quantity}{' '}
            <span className="text-sm font-semibold text-fg-muted">
              {translate(`enums:stockUnit.${item.unit}`)}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('stock.criticalLevel')}</dt>
          <dd className="text-lg font-extrabold text-fg tabular-nums">
            {item.criticalLevel}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('stock.expiresAt')}</dt>
          <dd className="font-bold text-fg tabular-nums">
            {item.expiresAt
              ? formatDate(item.expiresAt.slice(0, 10), i18n.language, {
                  dateStyle: 'medium',
                })
              : t('stock.noExpiry')}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:col-span-2">
        <div
          role="group"
          aria-label={t('stock.quickAdjust', { name: item.name })}
          className="flex items-center gap-2"
        >
          <Button
            variant="secondary"
            size="sm"
            className="w-11 px-0"
            aria-label={t('stock.decrease', { name: item.name })}
            disabled={step.isPending || !canStep(item, -1)}
            onClick={() => step.mutate(-1)}
          >
            <MinusIcon className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-11 px-0"
            aria-label={t('stock.increase', { name: item.name })}
            disabled={step.isPending || !canStep(item, 1)}
            onClick={() => step.mutate(1)}
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t('stock.adjustLabel', { name: item.name })}
            onClick={() => onAction({ kind: 'adjust', item })}
          >
            {t('stock.adjust')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(1, item.quantity)}
              step={1}
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              disabled={sellBlockedReason !== null}
              aria-label={t('stock.sellQuantityLabel', { name: item.name })}
              className="h-11 w-16 rounded-xl border-[1.5px] border-input bg-surface px-2 text-center text-sm font-bold text-fg tabular-nums disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-fg-muted dark:bg-bg"
            />
            <span className="group relative inline-flex">
              <Button
                size="sm"
                aria-label={t('stock.sellLabel', { name: item.name })}
                aria-disabled={sellBlockedReason !== null || undefined}
                aria-describedby={sellBlockedReason ? sellTooltipId : undefined}
                className={
                  sellBlockedReason
                    ? 'cursor-not-allowed opacity-60 hover:bg-accent! active:bg-accent!'
                    : undefined
                }
                onClick={() => {
                  if (sellBlockedReason) return;
                  onAction({ kind: 'sell', item, quantity: sellQuantity });
                }}
              >
                <CartIcon className="size-4" />
                {t('stock.sell')}
              </Button>
              {sellBlockedReason && (
                <span
                  id={sellTooltipId}
                  role="tooltip"
                  className="pointer-events-none absolute right-0 bottom-full z-10 mb-2 hidden w-max max-w-56 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-semibold text-fg shadow-soft ring-1 ring-line group-focus-within:block group-hover:block"
                >
                  {sellBlockedReason}
                </span>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t('stock.editLabel', { name: item.name })}
            onClick={() => onAction({ kind: 'edit', item })}
          >
            <PencilIcon className="size-4" />
            {t('stock.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger! hover:text-danger!"
            aria-label={t('stock.deleteLabel', { name: item.name })}
            onClick={() => onAction({ kind: 'delete', item })}
          >
            <TrashIcon className="size-4" />
            {t('stock.delete')}
          </Button>
        </div>
      </div>
      {step.isError && (
        <ErrorAlert error={step.error} className="sm:col-span-2" />
      )}
    </li>
  );
}

export function StockPage() {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  useDocumentTitle(t('stock.pageTitle'));
  const clinic = useClinicAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readStockFilters(searchParams);
  const today = todayInBusinessTimeZone();
  const [action, setAction] = useState<StockAction | null>(null);
  const closeAction = () => setAction(null);
  const stock = useStock(clinic.id, {
    page: filters.page,
    pageSize: STOCK_PAGE_SIZE,
    category: filters.category || undefined,
    onlyBelowCritical: filters.onlyBelowCritical || undefined,
  });

  const apply = (next: Partial<StockFilters>) =>
    setSearchParams(writeStockFilters({ ...filters, page: 1, ...next }));
  const filtered = Boolean(filters.category) || filters.onlyBelowCritical;
  const pageCount = stock.isSuccess
    ? pageCountOf(stock.data.total, STOCK_PAGE_SIZE)
    : 0;

  if (stock.isSuccess && pageCount > 0 && filters.page > pageCount) {
    return (
      <Navigate
        replace
        to={{
          search: writeStockFilters({
            ...filters,
            page: pageCount,
          }).toString(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stock.title')}
        lead={t('stock.lead')}
        actions={
          <Link
            to="/clinic/stock/new"
            className={buttonClasses('primary', 'md')}
          >
            <PlusIcon className="size-5" />
            {t('stock.add')}
          </Link>
        }
      />

      <div className="grid gap-4 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:grid-cols-2 sm:items-end">
        <Select
          label={t('stock.category')}
          name="category"
          value={filters.category}
          onChange={(e) =>
            apply({ category: e.target.value as StockCategory | '' })
          }
          options={[
            { value: '', label: t('stock.allCategories') },
            ...STOCK_CATEGORIES.map((code) => ({
              value: code,
              label: translate(`enums:stockCategory.${code}`),
            })),
          ]}
        />
        <Checkbox
          label={t('stock.onlyBelowCritical')}
          checked={filters.onlyBelowCritical}
          onChange={(e) => apply({ onlyBelowCritical: e.target.checked })}
          className="sm:pb-3"
        />
      </div>

      {stock.isPending && <LoadingBlock />}
      {stock.isError && <ErrorAlert error={stock.error} />}
      {stock.isSuccess &&
        (stock.data.total === 0 ? (
          <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-14 text-center shadow-soft light:ring-1 light:ring-line">
            <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-fg-muted">
              <BoxIcon className="size-9" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-fg">
              {filtered ? t('stock.emptyFiltered') : t('stock.emptyTitle')}
            </h2>
            {!filtered && (
              <p className="mt-2 max-w-sm text-fg-muted">
                {t('stock.emptyBody')}
              </p>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {stock.data.items.map((item) => (
                <StockRow
                  key={item.id}
                  clinicId={clinic.id}
                  item={item}
                  today={today}
                  onAction={setAction}
                />
              ))}
            </ul>
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              busy={stock.isFetching}
              onChange={(page) =>
                setSearchParams(writeStockFilters({ ...filters, page }))
              }
            />
          </>
        ))}

      {action?.kind === 'sell' && (
        <StockSaleModal
          key={action.item.id}
          clinicId={clinic.id}
          item={action.item}
          initialQuantity={action.quantity}
          onClose={closeAction}
        />
      )}
      {action?.kind === 'adjust' && (
        <StockAdjustModal
          key={action.item.id}
          clinicId={clinic.id}
          item={action.item}
          onClose={closeAction}
        />
      )}
      {action?.kind === 'edit' && (
        <StockEditModal
          key={action.item.id}
          clinicId={clinic.id}
          item={action.item}
          onClose={closeAction}
        />
      )}
      {action?.kind === 'delete' && (
        <StockDeleteModal
          key={action.item.id}
          clinicId={clinic.id}
          item={action.item}
          onClose={closeAction}
        />
      )}
    </div>
  );
}
