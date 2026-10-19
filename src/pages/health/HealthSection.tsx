import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { MedicalRecord, RecordType } from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { Select } from '@/components/form/Select';
import { TextField } from '@/components/form/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { DocumentIcon, LockIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Pagination } from '@/components/ui/Pagination';
import { TableScroll } from '@/components/ui/TableScroll';
import { addDays } from '@/lib/consentExpiry';
import { cn } from '@/lib/cn';
import { formatDate, todayInBusinessTimeZone } from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import type { HealthAccess, HealthTab } from './healthAccess';
import { DocumentActions } from './DocumentActions';
import { DocumentsPanel } from './DocumentsPanel';
import {
  HEALTH_PAGE_SIZE,
  useLabResults,
  usePrescriptions,
  useRecords,
  useVaccinations,
} from './queries';
import { LabFlagBadge, RecordDetails, RecordTypeBadge } from './RecordDetails';
import {
  formatBytes,
  prescriptionEndDate,
  RECORD_TYPE_CODES,
  RECORD_TYPES,
} from './recordModel';
import { useClinicLabel } from './useClinicLabel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const TABS: HealthTab[] = [
  'records',
  'vaccinations',
  'prescriptions',
  'labResults',
  'documents',
];

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-cream-100 px-4 py-8 text-center font-semibold text-cocoa-600">
      {children}
    </p>
  );
}

function NoAccess({ tab }: { tab: HealthTab }) {
  const { t } = useTranslation('health');
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-cream-100 px-4 py-5 text-cocoa-700">
      <LockIcon className="mt-0.5 size-5 shrink-0 text-cocoa-500" />
      <p>{t(`noAccess.${tab}`)}</p>
    </div>
  );
}

function RecordCard({
  record,
  clinicLabel,
}: {
  record: MedicalRecord;
  clinicLabel: string;
}) {
  const { t, i18n } = useTranslation('health');
  return (
    <article className="space-y-4 rounded-2xl p-5 ring-1 ring-cream-300/70">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <RecordTypeBadge type={record.type} />
            {record.sourceDraftReviewId && (
              <Badge>{t('records.fromDraft')}</Badge>
            )}
          </div>
          <h3 className="mt-2 text-lg font-extrabold text-cocoa-900">
            {record.title}
          </h3>
          <p className="text-sm text-cocoa-500">{clinicLabel}</p>
        </div>
        <p className="text-sm font-semibold text-cocoa-600">
          {formatDate(record.recordedAt, i18n.language, {
            dateStyle: 'medium',
          })}
        </p>
      </header>
      <RecordDetails content={record} />
      {record.attachments.length > 0 && (
        <ul className="space-y-1 text-sm">
          {record.attachments.map((file) => (
            <li
              key={file.documentId}
              className="flex flex-wrap items-center justify-between gap-2 text-cocoa-600"
            >
              <span className="flex min-w-0 items-center gap-2">
                <DocumentIcon className="size-4 shrink-0" />
                <span className="truncate font-semibold">
                  {file.originalName || t('records.attachment')}
                </span>
                {file.sizeBytes > 0 && (
                  <span className="shrink-0 text-cocoa-500">
                    {formatBytes(file.sizeBytes, i18n.language)}
                  </span>
                )}
              </span>
              <DocumentActions
                documentId={file.documentId}
                fileName={file.originalName || t('records.attachment')}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function RecordsPanel({
  petId,
  ownClinicId,
}: {
  petId: string;
  ownClinicId?: string;
}) {
  const { t, i18n } = useTranslation('health');
  const translate = i18n.t.bind(i18n) as unknown as LooseT;
  const [type, setType] = useState<RecordType | undefined>(undefined);
  const [page, setPage] = useState(1);
  const records = useRecords(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    type,
  });
  const clinicLabel = useClinicLabel(
    records.data?.records.map((record) => record.clinicId) ?? [],
    ownClinicId,
  );

  return (
    <div className="space-y-4">
      <Select
        label={t('records.typeFilter')}
        name="recordType"
        value={type === undefined ? '' : String(type)}
        onChange={(e) => {
          setType(
            e.target.value ? (Number(e.target.value) as RecordType) : undefined,
          );
          setPage(1);
        }}
        options={[
          { value: '', label: t('records.allTypes') },
          ...RECORD_TYPES.map((value) => ({
            value: String(value),
            label: translate(`enums:recordType.${RECORD_TYPE_CODES[value]}`),
          })),
        ]}
        className="sm:max-w-xs"
      />
      {records.isPending && <LoadingBlock />}
      {records.isError && <ErrorAlert error={records.error} />}
      {records.isSuccess &&
        (records.data.total === 0 ? (
          <Empty>
            {type === undefined
              ? t('records.empty')
              : t('records.emptyFiltered')}
          </Empty>
        ) : (
          <div
            className={cn(
              'space-y-3 transition-opacity',
              records.isPlaceholderData && 'opacity-60',
            )}
          >
            {records.data.records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                clinicLabel={clinicLabel(record.clinicId)}
              />
            ))}
            <Pagination
              page={page}
              pageCount={pageCountOf(records.data.total, HEALTH_PAGE_SIZE)}
              busy={records.isFetching}
              onChange={setPage}
            />
          </div>
        ))}
    </div>
  );
}

function DueBadge({ nextDueAt, today }: { nextDueAt: string; today: string }) {
  const { t } = useTranslation('health');
  if (!nextDueAt) return null;
  if (nextDueAt < today)
    return <Badge tone="coral">{t('vaccination.overdue')}</Badge>;
  if (nextDueAt <= addDays(today, 30)) {
    return <Badge tone="brand">{t('vaccination.dueSoon')}</Badge>;
  }
  return null;
}

function VaccinationsPanel({
  petId,
  ownClinicId,
}: {
  petId: string;
  ownClinicId?: string;
}) {
  const { t, i18n } = useTranslation('health');
  const today = todayInBusinessTimeZone();
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);
  const [page, setPage] = useState(1);
  const vaccinations = useVaccinations(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    onlyUpcoming: onlyUpcoming || undefined,
  });
  const clinicLabel = useClinicLabel(
    vaccinations.data?.vaccinations.map((item) => item.clinicId) ?? [],
    ownClinicId,
  );
  const date = (value: string) =>
    value ? formatDate(value, i18n.language, { dateStyle: 'medium' }) : '—';

  return (
    <div className="space-y-4">
      <Checkbox
        label={t('vaccination.onlyUpcoming')}
        checked={onlyUpcoming}
        onChange={(e) => {
          setOnlyUpcoming(e.target.checked);
          setPage(1);
        }}
      />
      {vaccinations.isPending && <LoadingBlock />}
      {vaccinations.isError && <ErrorAlert error={vaccinations.error} />}
      {vaccinations.isSuccess &&
        (vaccinations.data.total === 0 ? (
          <Empty>
            {onlyUpcoming
              ? t('vaccination.emptyUpcoming')
              : t('vaccination.empty')}
          </Empty>
        ) : (
          <div
            className={cn(
              'space-y-3 transition-opacity',
              vaccinations.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-cream-200 rounded-2xl ring-1 ring-cream-300/70">
              {vaccinations.data.vaccinations.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-cocoa-900">
                      {item.vaccineName}
                    </p>
                    <p className="text-sm text-cocoa-500">
                      {clinicLabel(item.clinicId)}
                      {item.batchNumber &&
                        ` · ${t('vaccination.batchShort', { value: item.batchNumber })}`}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 text-sm sm:text-right">
                    <div>
                      <dt className="font-semibold text-cocoa-500">
                        {t('vaccination.administeredAt')}
                      </dt>
                      <dd className="font-bold text-cocoa-800">
                        {date(item.administeredAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-cocoa-500">
                        {t('vaccination.nextDueAt')}
                      </dt>
                      <dd className="flex flex-wrap items-center gap-2 font-bold text-cocoa-800 sm:justify-end">
                        {date(item.nextDueAt)}
                        <DueBadge nextDueAt={item.nextDueAt} today={today} />
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCountOf(vaccinations.data.total, HEALTH_PAGE_SIZE)}
              busy={vaccinations.isFetching}
              onChange={setPage}
            />
          </div>
        ))}
    </div>
  );
}

function PrescriptionsPanel({
  petId,
  ownClinicId,
}: {
  petId: string;
  ownClinicId?: string;
}) {
  const { t, i18n } = useTranslation('health');
  const today = todayInBusinessTimeZone();
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);
  const prescriptions = usePrescriptions(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    onlyActive: onlyActive || undefined,
  });
  const clinicLabel = useClinicLabel(
    prescriptions.data?.prescriptions.map((item) => item.clinicId) ?? [],
    ownClinicId,
  );
  const date = (value: string) =>
    value ? formatDate(value, i18n.language, { dateStyle: 'medium' }) : '—';

  return (
    <div className="space-y-4">
      <Checkbox
        label={t('prescription.onlyActive')}
        checked={onlyActive}
        onChange={(e) => {
          setOnlyActive(e.target.checked);
          setPage(1);
        }}
      />
      {prescriptions.isPending && <LoadingBlock />}
      {prescriptions.isError && <ErrorAlert error={prescriptions.error} />}
      {prescriptions.isSuccess &&
        (prescriptions.data.total === 0 ? (
          <Empty>
            {onlyActive
              ? t('prescription.emptyActive')
              : t('prescription.empty')}
          </Empty>
        ) : (
          <div
            className={cn(
              'space-y-3 transition-opacity',
              prescriptions.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-cream-200 rounded-2xl ring-1 ring-cream-300/70">
              {prescriptions.data.prescriptions.map((item) => {
                const end = prescriptionEndDate(
                  item.prescribedAt,
                  item.durationDays,
                );
                const active = Boolean(end) && end >= today;
                return (
                  <li key={item.id} className="space-y-2 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 font-extrabold text-cocoa-900">
                          {item.medicationName}
                          {active && (
                            <Badge tone="sage">
                              {t('prescription.active')}
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-cocoa-600">
                          {item.dosage} · {item.frequency}
                        </p>
                        <p className="text-sm text-cocoa-500">
                          {clinicLabel(item.clinicId)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-cocoa-600 sm:text-right">
                        {date(item.prescribedAt)} – {date(end)}
                        <span className="block font-normal text-cocoa-500">
                          {t('prescription.durationValue', {
                            count: item.durationDays,
                          })}
                        </span>
                      </p>
                    </div>
                    {item.instructions && (
                      <p className="text-sm whitespace-pre-line text-cocoa-700">
                        {item.instructions}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCountOf(
                prescriptions.data.total,
                HEALTH_PAGE_SIZE,
              )}
              busy={prescriptions.isFetching}
              onChange={setPage}
            />
          </div>
        ))}
    </div>
  );
}

function LabResultsPanel({ petId }: { petId: string }) {
  const { t, i18n } = useTranslation('health');
  const [draft, setDraft] = useState('');
  const [testName, setTestName] = useState('');
  const [page, setPage] = useState(1);
  const results = useLabResults(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    testName: testName || undefined,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTestName(draft.trim());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <form
        role="search"
        noValidate
        onSubmit={submit}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <TextField
          label={t('lab.search')}
          name="testName"
          autoComplete="off"
          maxLength={128}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="sm:w-72"
        />
        <Button type="submit" variant="secondary">
          {t('lab.searchSubmit')}
        </Button>
      </form>
      {results.isPending && <LoadingBlock />}
      {results.isError && <ErrorAlert error={results.error} />}
      {results.isSuccess &&
        (results.data.total === 0 ? (
          <Empty>{testName ? t('lab.emptyFiltered') : t('lab.empty')}</Empty>
        ) : (
          <div
            className={cn(
              'space-y-3 transition-opacity',
              results.isPlaceholderData && 'opacity-60',
            )}
          >
            <TableScroll
              label={t('tabs.labResults')}
              className="rounded-2xl ring-1 ring-cream-300/70"
            >
              <table className="w-full min-w-[34rem] text-sm text-cocoa-800 tabular-nums">
                <caption className="sr-only">{t('tabs.labResults')}</caption>
                <thead>
                  <tr className="border-b border-cream-300 text-left text-xs font-bold tracking-wide text-cocoa-500 uppercase">
                    <th scope="col" className="px-4 py-2">
                      {t('lab.test')}
                    </th>
                    <th scope="col" className="px-4 py-2">
                      {t('lab.value')}
                    </th>
                    <th scope="col" className="px-4 py-2">
                      {t('lab.reference')}
                    </th>
                    <th scope="col" className="px-4 py-2">
                      {t('lab.flag')}
                    </th>
                    <th scope="col" className="px-4 py-2">
                      {t('lab.date')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.data.labResults.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-cream-200 last:border-0"
                    >
                      <th
                        scope="row"
                        className="px-4 py-2.5 text-left font-bold"
                      >
                        {item.testName}
                      </th>
                      <td className="px-4 py-2.5">
                        {item.value} {item.unit}
                      </td>
                      <td className="px-4 py-2.5 text-cocoa-600">
                        {item.referenceRange || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <LabFlagBadge flag={item.flag} />
                      </td>
                      <td className="px-4 py-2.5 text-cocoa-600">
                        {formatDate(item.sampledAt, i18n.language, {
                          dateStyle: 'medium',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination
              page={page}
              pageCount={pageCountOf(results.data.total, HEALTH_PAGE_SIZE)}
              busy={results.isFetching}
              onChange={setPage}
            />
          </div>
        ))}
    </div>
  );
}

export function HealthSection({
  petId,
  access,
  ownClinicId,
  actions,
}: {
  petId: string;
  access: HealthAccess;
  ownClinicId?: string;
  actions?: ReactNode;
}) {
  const { t } = useTranslation('health');
  const baseId = useId();
  const [tab, setTab] = useState<HealthTab>('records');
  const tabRefs = useRef<Partial<Record<HealthTab, HTMLButtonElement | null>>>(
    {},
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.indexOf(tab);
    const next =
      event.key === 'ArrowRight'
        ? TABS[(index + 1) % TABS.length]
        : event.key === 'ArrowLeft'
          ? TABS[(index - 1 + TABS.length) % TABS.length]
          : event.key === 'Home'
            ? TABS[0]
            : event.key === 'End'
              ? TABS[TABS.length - 1]
              : undefined;
    if (!next) return;
    event.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section className="space-y-5 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-cream-300/60 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-cocoa-900">
          <DocumentIcon className="size-5 text-cocoa-500" />
          {t('title')}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div
        role="tablist"
        aria-label={t('tabsLabel')}
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {TABS.map((key) => (
          <button
            key={key}
            ref={(element) => {
              tabRefs.current[key] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`${baseId}-panel-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={onKeyDown}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors',
              tab === key
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-cream-200 text-cocoa-700 hover:bg-cream-300',
            )}
          >
            {!access[key] && <LockIcon className="size-3.5" />}
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
      >
        {!access[tab] ? (
          <NoAccess tab={tab} />
        ) : tab === 'records' ? (
          <RecordsPanel petId={petId} ownClinicId={ownClinicId} />
        ) : tab === 'vaccinations' ? (
          <VaccinationsPanel petId={petId} ownClinicId={ownClinicId} />
        ) : tab === 'prescriptions' ? (
          <PrescriptionsPanel petId={petId} ownClinicId={ownClinicId} />
        ) : tab === 'labResults' ? (
          <LabResultsPanel petId={petId} />
        ) : (
          <DocumentsPanel petId={petId} ownClinicId={ownClinicId} />
        )}
      </div>
    </section>
  );
}
