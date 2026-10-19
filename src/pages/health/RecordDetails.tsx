import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LabResultFlag,
  type LabResultItem,
  type RecordContent,
} from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { TableScroll } from '@/components/ui/TableScroll';
import { formatDate } from '@/lib/format';
import { prescriptionEndDate, RECORD_TYPE_CODES } from './recordModel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

export function RecordTypeBadge({ type }: { type: number }) {
  const { i18n } = useTranslation();
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const code = RECORD_TYPE_CODES[type];
  return (
    <Badge tone="brand">
      {code ? translate(`enums:recordType.${code}`) : '—'}
    </Badge>
  );
}

export function LabFlagBadge({ flag }: { flag: number }) {
  const { t } = useTranslation('health');
  if (flag === LabResultFlag.NORMAL) {
    return <Badge tone="sage">{t('flags.normal')}</Badge>;
  }
  if (flag === LabResultFlag.LOW) {
    return <Badge tone="coral">{t('flags.low')}</Badge>;
  }
  if (flag === LabResultFlag.HIGH) {
    return <Badge tone="coral">{t('flags.high')}</Badge>;
  }
  return <span className="text-cocoa-500">—</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-cocoa-500 uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-semibold text-cocoa-800">{children}</dd>
    </div>
  );
}

export function LabItemsTable({
  items,
  caption,
}: {
  items: LabResultItem[];
  caption: string;
}) {
  const { t } = useTranslation('health');
  return (
    <TableScroll label={caption} className="-mx-1 px-1">
      <table className="w-full min-w-[28rem] text-sm text-cocoa-800 tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-cream-300 text-left text-xs font-bold tracking-wide text-cocoa-500 uppercase">
            <th scope="col" className="py-2 pr-3">
              {t('lab.test')}
            </th>
            <th scope="col" className="py-2 pr-3">
              {t('lab.value')}
            </th>
            <th scope="col" className="py-2 pr-3">
              {t('lab.reference')}
            </th>
            <th scope="col" className="py-2">
              {t('lab.flag')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.testName}-${index}`}
              className="border-b border-cream-200 last:border-0"
            >
              <th scope="row" className="py-2 pr-3 text-left font-bold">
                {item.testName || '—'}
              </th>
              <td className="py-2 pr-3">
                {item.value || '—'} {item.unit}
              </td>
              <td className="py-2 pr-3 text-cocoa-600">
                {item.referenceRange || '—'}
              </td>
              <td className="py-2">
                <LabFlagBadge flag={item.flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function RecordDetails({ content }: { content: RecordContent }) {
  const { t, i18n } = useTranslation('health');
  const date = (value: string | undefined) =>
    value ? formatDate(value, i18n.language, { dateStyle: 'medium' }) : '—';
  const vaccination = content.vaccination;
  const prescription = content.prescription;
  const labResult = content.labResult;
  const endDate = prescription
    ? prescriptionEndDate(prescription.prescribedAt, prescription.durationDays)
    : '';

  return (
    <div className="space-y-4 text-sm">
      {content.notes && (
        <p className="whitespace-pre-line text-cocoa-700">{content.notes}</p>
      )}
      {vaccination && (
        <dl className="grid gap-3 rounded-2xl bg-cream-100 p-4 sm:grid-cols-2">
          <Field label={t('vaccination.name')}>
            {vaccination.vaccineName || '—'}
          </Field>
          <Field label={t('vaccination.batch')}>
            {vaccination.batchNumber || '—'}
          </Field>
          <Field label={t('vaccination.administeredAt')}>
            {date(vaccination.administeredAt)}
          </Field>
          <Field label={t('vaccination.nextDueAt')}>
            {date(vaccination.nextDueAt)}
          </Field>
        </dl>
      )}
      {prescription && (
        <dl className="grid gap-3 rounded-2xl bg-cream-100 p-4 sm:grid-cols-2">
          <Field label={t('prescription.medication')}>
            {prescription.medicationName || '—'}
          </Field>
          <Field label={t('prescription.dosage')}>
            {prescription.dosage || '—'}
          </Field>
          <Field label={t('prescription.frequency')}>
            {prescription.frequency || '—'}
          </Field>
          <Field label={t('prescription.duration')}>
            {t('prescription.durationValue', {
              count: prescription.durationDays,
            })}
            {endDate && (
              <span className="block text-xs font-normal text-cocoa-500">
                {t('prescription.until', { date: date(endDate) })}
              </span>
            )}
          </Field>
          {prescription.instructions && (
            <div className="sm:col-span-2">
              <Field label={t('prescription.instructions')}>
                <span className="whitespace-pre-line font-normal">
                  {prescription.instructions}
                </span>
              </Field>
            </div>
          )}
        </dl>
      )}
      {labResult && (
        <div className="space-y-2 rounded-2xl bg-cream-100 p-4">
          <p className="text-xs font-bold tracking-wide text-cocoa-500 uppercase">
            {t('lab.sampledAt', { date: date(labResult.sampledAt) })}
          </p>
          <LabItemsTable
            items={Array.isArray(labResult.items) ? labResult.items : []}
            caption={t('lab.caption')}
          />
        </div>
      )}
    </div>
  );
}
