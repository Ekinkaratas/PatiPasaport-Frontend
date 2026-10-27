import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { RecordType, type LabResult, type MedicalRecord } from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { Select } from '@/components/form/Select';
import { TextField } from '@/components/form/TextField';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  DocumentIcon,
  LockIcon,
  StethoscopeIcon,
  SyringeIcon,
} from '@/components/ui/icons';
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
import { HealthEmpty } from './HealthEmpty';
import { LabExplanation } from './LabExplanation';
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
} from './recordModel';
import { useClinicLabel } from './useClinicLabel';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

const RECORDS_TAB_TYPES: RecordType[] = [
  RecordType.EXAMINATION,
  RecordType.SURGERY,
];

const TABS: HealthTab[] = [
  'records',
  'vaccinations',
  'prescriptions',
  'labResults',
  'documents',
];

type DotTone = 'ok' | 'accent' | 'danger' | 'muted';

const DOT_TONES: Record<DotTone, string> = {
  ok: 'bg-ok',
  accent: 'bg-accent light:bg-accent-fg',
  danger: 'bg-danger',
  muted: 'bg-input',
};

function StatusDot({ tone }: { tone: DotTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn('mt-2 size-2.5 rounded-full', DOT_TONES[tone])}
    />
  );
}

const ROW = 'grid grid-cols-[0.625rem_minmax(0,1fr)] gap-x-4 py-4';

function NoAccess({ tab }: { tab: HealthTab }) {
  const { t } = useTranslation('health');
  return (
    <div className="flex items-start gap-3 rounded-xl bg-bg px-4 py-5 text-fg">
      <LockIcon className="mt-0.5 size-5 shrink-0 text-fg-muted" />
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
    <article className="space-y-4 border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold wrap-break-word text-fg">
            {record.title}
          </h3>
          <p className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-fg-muted">
            <span>
              {formatDate(record.recordedAt, i18n.language, {
                dateStyle: 'medium',
              })}
            </span>
            <span>{clinicLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecordTypeBadge type={record.type} />
          {record.sourceDraftReviewId && (
            <Badge>{t('records.fromDraft')}</Badge>
          )}
        </div>
      </header>
      <RecordDetails content={record} />
      {record.attachments.length > 0 && (
        <ul className="space-y-2 text-sm">
          {record.attachments.map((file) => (
            <li
              key={file.documentId}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-bg px-4 py-2.5 text-fg"
            >
              <span className="flex min-w-0 items-center gap-2">
                <DocumentIcon className="size-4 shrink-0 text-fg-muted" />
                <span className="min-w-0 font-semibold wrap-break-word">
                  {file.originalName || t('records.attachment')}
                </span>
                {file.sizeBytes > 0 && (
                  <span className="shrink-0 text-fg-muted">
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
  const [type, setType] = useState<RecordType>(RecordType.EXAMINATION);
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
        value={String(type)}
        onChange={(e) => {
          setType(Number(e.target.value) as RecordType);
          setPage(1);
        }}
        options={RECORDS_TAB_TYPES.map((value) => ({
          value: String(value),
          label: translate(`enums:recordType.${RECORD_TYPE_CODES[value]}`),
        }))}
        className="sm:max-w-xs"
      />
      {records.isPending && <LoadingBlock />}
      {records.isError && <ErrorAlert error={records.error} />}
      {records.isSuccess &&
        (records.data.total === 0 ? (
          <HealthEmpty icon={<DocumentIcon className="size-6" />}>
            {t('records.emptyFiltered')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              records.isPlaceholderData && 'opacity-60',
            )}
          >
            <div className="border-t border-line pt-5">
              {records.data.records.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  clinicLabel={clinicLabel(record.clinicId)}
                />
              ))}
            </div>
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

type DueState = 'overdue' | 'dueSoon' | null;

function dueStateOf(nextDueAt: string, today: string): DueState {
  if (!nextDueAt) return null;
  if (nextDueAt < today) return 'overdue';
  if (nextDueAt <= addDays(today, 30)) return 'dueSoon';
  return null;
}

function DueBadge({ state }: { state: DueState }) {
  const { t } = useTranslation('health');
  if (state === 'overdue') {
    return <Badge tone="coral">{t('vaccination.overdue')}</Badge>;
  }
  if (state === 'dueSoon') {
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
          <HealthEmpty icon={<SyringeIcon className="size-6" />}>
            {onlyUpcoming
              ? t('vaccination.emptyUpcoming')
              : t('vaccination.empty')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              vaccinations.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-line border-y border-line">
              {vaccinations.data.vaccinations.map((item) => {
                const due = dueStateOf(item.nextDueAt, today);
                return (
                  <li key={item.id} className={ROW}>
                    <StatusDot
                      tone={
                        due === 'overdue'
                          ? 'danger'
                          : due === 'dueSoon'
                            ? 'accent'
                            : 'ok'
                      }
                    />
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="font-extrabold wrap-break-word text-fg">
                            {item.vaccineName}
                          </p>
                          <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
                            <span>{clinicLabel(item.clinicId)}</span>
                            {item.batchNumber && (
                              <span className="wrap-break-word">
                                {t('vaccination.batchShort', {
                                  value: item.batchNumber,
                                })}
                              </span>
                            )}
                          </p>
                        </div>
                        <DueBadge state={due} />
                      </div>
                      <dl className="grid grid-cols-2 gap-4 text-sm sm:max-w-md">
                        <div>
                          <dt className="text-fg-muted">
                            {t('vaccination.administeredAt')}
                          </dt>
                          <dd className="font-bold text-fg">
                            {date(item.administeredAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-fg-muted">
                            {t('vaccination.nextDueAt')}
                          </dt>
                          <dd className="font-bold text-fg">
                            {date(item.nextDueAt)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </li>
                );
              })}
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
          <HealthEmpty icon={<StethoscopeIcon className="size-6" />}>
            {onlyActive
              ? t('prescription.emptyActive')
              : t('prescription.empty')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              prescriptions.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-line border-y border-line">
              {prescriptions.data.prescriptions.map((item) => {
                const end = prescriptionEndDate(
                  item.prescribedAt,
                  item.durationDays,
                );
                const active = Boolean(end) && end >= today;
                return (
                  <li key={item.id} className={ROW}>
                    <StatusDot tone={active ? 'ok' : 'muted'} />
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="font-extrabold wrap-break-word text-fg">
                            {item.medicationName}
                          </p>
                          <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
                            <span>
                              {date(item.prescribedAt)} – {date(end)}
                            </span>
                            <span>{clinicLabel(item.clinicId)}</span>
                          </p>
                        </div>
                        {active && (
                          <Badge tone="sage">{t('prescription.active')}</Badge>
                        )}
                      </div>
                      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                        <div className="min-w-0">
                          <dt className="text-fg-muted">
                            {t('prescription.dosage')}
                          </dt>
                          <dd className="font-bold wrap-break-word text-fg">
                            {item.dosage}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-fg-muted">
                            {t('prescription.frequency')}
                          </dt>
                          <dd className="font-bold wrap-break-word text-fg">
                            {item.frequency}
                          </dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-fg-muted">
                            {t('prescription.duration')}
                          </dt>
                          <dd className="font-bold text-fg">
                            {t('prescription.durationValue', {
                              count: item.durationDays,
                            })}
                          </dd>
                        </div>
                      </dl>
                      {item.instructions && (
                        <p className="rounded-xl bg-bg px-4 py-3 text-sm whitespace-pre-line text-fg">
                          {item.instructions}
                        </p>
                      )}
                    </div>
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

interface LabGroup {
  recordId: string;
  clinicId: string;
  sampledAt: string;
  items: LabResult[];
}

function groupLabResults(items: LabResult[]): LabGroup[] {
  const groups = new Map<string, LabGroup>();
  for (const item of items) {
    const group = groups.get(item.recordId);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(item.recordId, {
        recordId: item.recordId,
        clinicId: item.clinicId,
        sampledAt: item.sampledAt,
        items: [item],
      });
    }
  }
  return [...groups.values()];
}

function LabGroupCard({
  group,
  clinicLabel,
  showExplanation,
}: {
  group: LabGroup;
  clinicLabel: string;
  showExplanation: boolean;
}) {
  const { t, i18n } = useTranslation('health');
  const headingId = useId();
  const title = t('lab.groupTitle', {
    date: formatDate(group.sampledAt, i18n.language, { dateStyle: 'medium' }),
  });

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 rounded-xl p-4 ring-1 ring-line sm:p-5"
    >
      <header className="min-w-0">
        <h3
          id={headingId}
          className="text-lg font-extrabold wrap-break-word text-fg"
        >
          {title}
        </h3>
        <p className="mt-0.5 text-sm wrap-break-word text-fg-muted">
          {clinicLabel}
        </p>
      </header>
      <TableScroll label={title}>
        <table
          aria-describedby={headingId}
          className="w-full min-w-[34rem] text-sm text-fg tabular-nums"
        >
          <caption className="sr-only">{t('tabs.labResults')}</caption>
          <thead>
            <tr className="border-b border-line text-left font-semibold text-fg-muted">
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
            {group.items.map((item) => (
              <tr key={item.id} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-bold">
                  {item.testName}
                </th>
                <td className="px-4 py-3 font-semibold">
                  {item.value} {item.unit}
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {item.referenceRange || '—'}
                </td>
                <td className="px-4 py-3">
                  <LabFlagBadge flag={item.flag} />
                </td>
                <td className="px-4 py-3 text-fg-muted">
                  {formatDate(item.sampledAt, i18n.language, {
                    dateStyle: 'medium',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {showExplanation && <LabExplanation recordId={group.recordId} />}
    </section>
  );
}

function LabResultsPanel({
  petId,
  ownClinicId,
  showExplanations,
}: {
  petId: string;
  ownClinicId?: string;
  showExplanations: boolean;
}) {
  const { t } = useTranslation('health');
  const [draft, setDraft] = useState('');
  const [testName, setTestName] = useState('');
  const [page, setPage] = useState(1);
  const results = useLabResults(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    testName: testName || undefined,
  });
  const clinicLabel = useClinicLabel(
    results.data?.labResults.map((item) => item.clinicId) ?? [],
    ownClinicId,
  );

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
          <HealthEmpty icon={<DocumentIcon className="size-6" />}>
            {testName ? t('lab.emptyFiltered') : t('lab.empty')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              results.isPlaceholderData && 'opacity-60',
            )}
          >
            {groupLabResults(results.data.labResults).map((group) => (
              <LabGroupCard
                key={group.recordId}
                group={group}
                clinicLabel={clinicLabel(group.clinicId)}
                showExplanation={showExplanations}
              />
            ))}
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
  showLabExplanations = false,
}: {
  petId: string;
  access: HealthAccess;
  ownClinicId?: string;
  actions?: ReactNode;
  showLabExplanations?: boolean;
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
    <section className="space-y-5 rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-fg">
          <DocumentIcon className="size-5 text-fg-muted" />
          {t('title')}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div
        role="tablist"
        aria-label={t('tabsLabel')}
        className="flex w-fit max-w-full flex-wrap gap-2 rounded-xl bg-bg p-1"
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
              'flex min-h-11 shrink-0 items-center gap-1.5 rounded-[0.625rem] px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
              tab === key
                ? 'bg-surface text-fg shadow-soft dark:bg-surface-2'
                : 'text-fg-muted hover:text-fg',
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
          <LabResultsPanel
            petId={petId}
            ownClinicId={ownClinicId}
            showExplanations={showLabExplanations}
          />
        ) : (
          <DocumentsPanel petId={petId} ownClinicId={ownClinicId} />
        )}
      </div>
    </section>
  );
}
