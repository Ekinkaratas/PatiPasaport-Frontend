import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { RecordType, type MedicalRecord } from '@/api/types';
import { Checkbox } from '@/components/form/Checkbox';
import { Select } from '@/components/form/Select';
import { Badge } from '@/components/ui/Badge';
import { CollapseBody, CollapseButton } from '@/components/ui/Collapsible';
import { useCollapsible } from '@/components/ui/useCollapsible';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import {
  DocumentIcon,
  LockIcon,
  StethoscopeIcon,
  SyringeIcon,
} from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Pagination } from '@/components/ui/Pagination';
import { addDays } from '@/lib/consentExpiry';
import { cn } from '@/lib/cn';
import { PAGE_SIZES, type PageSize } from '@/domain/constants';
import {
  formatDate,
  formatDateTime,
  todayInBusinessTimeZone,
} from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import type { HealthAccess, HealthTab } from './healthAccess';
import { DocumentActions } from './DocumentActions';
import { DocumentsPanel } from './DocumentsPanel';
import { HealthEmpty } from './HealthEmpty';
import { LabExplanation } from './LabExplanation';
import {
  HEALTH_PAGE_SIZE,
  usePrescriptions,
  useRecords,
  useVaccinations,
} from './queries';
import { RecordDetails, RecordTypeBadge } from './RecordDetails';
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

function LabRecordItem({
  record,
  showExplanation,
}: {
  record: MedicalRecord;
  showExplanation: boolean;
}) {
  const { t, i18n } = useTranslation('health');
  const sampledAt = record.labResult?.sampledAt || record.recordedAt;

  return (
    <li className="space-y-4 py-4">
      {record.attachments.length > 0 ? (
        record.attachments.map((file) => {
          const name = file.originalName || t('records.attachment');
          const uploadedAt = file.uploadedAt || record.createdAt;
          return (
            <div
              key={file.documentId}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted">
                <DocumentIcon className="size-5" />
              </span>
              <div className="min-w-0 space-y-3">
                <div className="min-w-0">
                  <p className="font-extrabold wrap-break-word text-fg">
                    {name}
                  </p>
                  <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
                    {uploadedAt && (
                      <span>{formatDateTime(uploadedAt, i18n.language)}</span>
                    )}
                    {file.sizeBytes > 0 && (
                      <span>{formatBytes(file.sizeBytes, i18n.language)}</span>
                    )}
                  </p>
                </div>
                <DocumentActions documentId={file.documentId} fileName={name} />
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
          <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted">
            <DocumentIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold wrap-break-word text-fg">
              {record.title}
            </p>
            <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
              <span>
                {t('lab.sampledAt', {
                  date: formatDate(sampledAt, i18n.language, {
                    dateStyle: 'medium',
                  }),
                })}
              </span>
              <span>{t('lab.noDocument')}</span>
            </p>
          </div>
        </div>
      )}
      {showExplanation && <LabExplanation recordId={record.id} />}
    </li>
  );
}

function LabResultsPanel({
  petId,
  showExplanations,
}: {
  petId: string;
  showExplanations: boolean;
}) {
  const { t } = useTranslation('health');
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const records = useRecords(petId, {
    page,
    pageSize,
    type: RecordType.LAB_RESULT,
  });

  return (
    <div className="space-y-4">
      <Select
        label={t('lab.pageSize')}
        name="labPageSize"
        value={String(pageSize)}
        onChange={(e) => {
          setPageSize(Number(e.target.value) as PageSize);
          setPage(1);
        }}
        options={PAGE_SIZES.map((size) => ({
          value: String(size),
          label: String(size),
        }))}
        className="w-32"
      />
      {records.isPending && <LoadingBlock />}
      {records.isError && <ErrorAlert error={records.error} />}
      {records.isSuccess &&
        (records.data.total === 0 ? (
          <HealthEmpty icon={<DocumentIcon className="size-6" />}>
            {t('lab.empty')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              records.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-line border-y border-line">
              {records.data.records.map((record) => (
                <LabRecordItem
                  key={record.id}
                  record={record}
                  showExplanation={showExplanations}
                />
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCountOf(records.data.total, pageSize)}
              busy={records.isFetching}
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
  const collapse = useCollapsible();
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
    <section className="rounded-2xl bg-surface p-6 shadow-soft light:ring-1 light:ring-line sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-fg">
          <DocumentIcon className="size-5 text-fg-muted" />
          {t('title')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <CollapseButton state={collapse} label={t('title')} />
        </div>
      </div>
      <CollapseBody state={collapse} className="space-y-5 pt-5">
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
              showExplanations={showLabExplanations}
            />
          ) : (
            <DocumentsPanel petId={petId} ownClinicId={ownClinicId} />
          )}
        </div>
      </CollapseBody>
    </section>
  );
}
