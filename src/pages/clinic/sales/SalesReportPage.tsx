import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { SalesFigures, StockSalesSummary } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { TableScroll } from '@/components/ui/TableScroll';
import { cn } from '@/lib/cn';
import {
  formatDate,
  formatMoney,
  formatMonth,
  monthInBusinessTimeZone,
} from '@/lib/format';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { useClinicAccount } from '../clinicContext';
import { useSalesSummary } from '../queries';
import { DailySalesChart } from './DailySalesChart';
import { readMonth, shiftMonth } from './salesModel';
import { SalesTabs } from './SalesTabs';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60">
      <p className="text-sm font-semibold text-cocoa-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-cocoa-900">{value}</p>
      {note && <p className="mt-1 text-sm text-cocoa-500">{note}</p>}
    </div>
  );
}

function Card({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-cocoa-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function FigureCells({
  figures,
  language,
}: {
  figures: SalesFigures;
  language: string;
}) {
  return (
    <>
      <td className="px-3 py-2.5 text-right">{figures.salesCount}</td>
      <td className="px-3 py-2.5 text-right">
        {formatMoney(figures.revenue, language)}
      </td>
      <td className="px-3 py-2.5 text-right">
        {formatMoney(figures.cost, language)}
      </td>
      <td
        className={cn(
          'px-3 py-2.5 text-right font-bold',
          figures.profit < 0 ? 'text-coral-700' : 'text-cocoa-900',
        )}
      >
        {formatMoney(figures.profit, language)}
      </td>
    </>
  );
}

function FigureHeads() {
  const { t } = useTranslation('clinic');
  return (
    <>
      <th scope="col" className="px-3 py-2 text-right">
        {t('salesReport.salesCount')}
      </th>
      <th scope="col" className="px-3 py-2 text-right">
        {t('salesReport.revenue')}
      </th>
      <th scope="col" className="px-3 py-2 text-right">
        {t('salesReport.cost')}
      </th>
      <th scope="col" className="px-3 py-2 text-right">
        {t('salesReport.profit')}
      </th>
    </>
  );
}

function Table({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <TableScroll label={caption} className="-mx-6 px-6">
      <table className="w-full min-w-[34rem] text-sm text-cocoa-800 tabular-nums">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </TableScroll>
  );
}

const HEAD_ROW =
  'border-b border-cream-300 text-left text-xs font-bold tracking-wide text-cocoa-500 uppercase';
const BODY_ROW = 'border-b border-cream-200 last:border-0';

function Report({ summary }: { summary: StockSalesSummary }) {
  const { t, i18n } = useTranslation('clinic');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const language = i18n.language;
  const money = (kurus: number) => formatMoney(kurus, language);
  const [showTable, setShowTable] = useState(false);
  const { totals } = summary;
  const margin =
    totals.revenue > 0
      ? Math.round((totals.profit / totals.revenue) * 1000) / 10
      : null;
  const soldDays = summary.daily.filter((day) => day.salesCount > 0);
  const shortDate = (date: string) =>
    formatDate(date, language, { day: 'numeric', month: 'short' });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label={t('salesReport.revenue')} value={money(totals.revenue)} />
        <Tile label={t('salesReport.cost')} value={money(totals.cost)} />
        <Tile
          label={t('salesReport.profit')}
          value={money(totals.profit)}
          note={
            margin === null
              ? undefined
              : t('salesReport.margin', {
                  value: new Intl.NumberFormat(
                    language === 'tr' ? 'tr-TR' : 'en-GB',
                  ).format(margin),
                })
          }
        />
        <Tile
          label={t('salesReport.salesCount')}
          value={String(totals.salesCount)}
        />
      </div>

      <Card
        title={t('salesReport.dailyTitle')}
        actions={
          totals.salesCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={showTable}
              onClick={() => setShowTable((current) => !current)}
            >
              {showTable
                ? t('salesReport.showChart')
                : t('salesReport.showTable')}
            </Button>
          )
        }
      >
        {totals.salesCount === 0 ? (
          <p className="rounded-2xl bg-cream-200 px-4 py-8 text-center font-semibold text-cocoa-600">
            {t('salesReport.empty')}
          </p>
        ) : showTable ? (
          <Table caption={t('salesReport.dailyTitle')}>
            <thead>
              <tr className={HEAD_ROW}>
                <th scope="col" className="px-3 py-2">
                  {t('salesReport.day')}
                </th>
                <FigureHeads />
              </tr>
            </thead>
            <tbody>
              {soldDays.map((day) => (
                <tr key={day.date} className={BODY_ROW}>
                  <th scope="row" className="px-3 py-2.5 text-left font-bold">
                    {formatDate(day.date, language, {
                      day: 'numeric',
                      month: 'long',
                      weekday: 'short',
                    })}
                  </th>
                  <FigureCells figures={day} language={language} />
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <DailySalesChart days={summary.daily} />
        )}
      </Card>

      <Card title={t('salesReport.weeklyTitle')}>
        <Table caption={t('salesReport.weeklyTitle')}>
          <thead>
            <tr className={HEAD_ROW}>
              <th scope="col" className="px-3 py-2">
                {t('salesReport.week')}
              </th>
              <FigureHeads />
            </tr>
          </thead>
          <tbody>
            {summary.weekly.map((week) => (
              <tr key={week.weekStart} className={BODY_ROW}>
                <th scope="row" className="px-3 py-2.5 text-left font-bold">
                  {week.weekStart === week.weekEnd
                    ? shortDate(week.weekStart)
                    : `${shortDate(week.weekStart)} – ${shortDate(week.weekEnd)}`}
                </th>
                <FigureCells figures={week} language={language} />
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title={t('salesReport.productsTitle')}>
        {summary.products.length === 0 ? (
          <p className="text-cocoa-600">{t('salesReport.noProducts')}</p>
        ) : (
          <Table caption={t('salesReport.productsTitle')}>
            <thead>
              <tr className={HEAD_ROW}>
                <th scope="col" className="px-3 py-2">
                  {t('salesReport.product')}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  {t('salesReport.quantity')}
                </th>
                <FigureHeads />
              </tr>
            </thead>
            <tbody>
              {summary.products.map((product) => (
                <tr
                  key={product.stockItemId || `deleted:${product.itemName}`}
                  className={BODY_ROW}
                >
                  <th scope="row" className="px-3 py-2.5 text-left font-bold">
                    {product.itemName}
                    {!product.stockItemId && (
                      <Badge className="ml-2 align-middle">
                        {t('sales.deletedItem')}
                      </Badge>
                    )}
                  </th>
                  <td className="px-3 py-2.5 text-right">
                    {product.quantity}{' '}
                    {translate(`enums:stockUnit.${product.unit}`)}
                  </td>
                  <FigureCells figures={product} language={language} />
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

export function SalesReportPage() {
  const { t, i18n } = useTranslation('clinic');
  useDocumentTitle(t('salesReport.pageTitle'));
  const clinic = useClinicAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const current = monthInBusinessTimeZone();
  const month = readMonth(searchParams.get('month'), current);
  const summary = useSalesSummary(clinic.id, month);

  const go = (next: string) =>
    setSearchParams(next === current ? {} : { month: next });

  return (
    <div className="space-y-6">
      <PageHeader title={t('sales.title')} lead={t('sales.lead')} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SalesTabs />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="w-9 px-0"
            aria-label={t('salesReport.previousMonth')}
            onClick={() => go(shiftMonth(month, -1))}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <p
            aria-live="polite"
            className="min-w-36 text-center font-extrabold text-cocoa-900"
          >
            {formatMonth(month, i18n.language)}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="w-9 px-0"
            aria-label={t('salesReport.nextMonth')}
            disabled={month >= current}
            onClick={() => go(shiftMonth(month, 1))}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
      {summary.isPending && <LoadingBlock />}
      {summary.isError && <ErrorAlert error={summary.error} />}
      {summary.isSuccess && (
        <div
          className={cn(
            'space-y-6 transition-opacity',
            summary.isPlaceholderData && 'opacity-60',
          )}
        >
          <Report summary={summary.data} />
        </div>
      )}
    </div>
  );
}
