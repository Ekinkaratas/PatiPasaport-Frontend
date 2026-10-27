import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DocumentStatus, type MedicalDocument } from '@/api/types';
import { Select } from '@/components/form/Select';
import { Badge } from '@/components/ui/Badge';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { DocumentIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import { DocumentActions } from './DocumentActions';
import { documentFailureMessage } from './documentFailure';
import { HEALTH_PAGE_SIZE, useDocuments } from './queries';
import { HealthEmpty } from './HealthEmpty';
import { formatBytes } from './recordModel';
import { useClinicLabel } from './useClinicLabel';

type StatusKey = 'queued' | 'processing' | 'draftReady' | 'failed';

const STATUS_KEYS: Record<number, StatusKey> = {
  [DocumentStatus.QUEUED]: 'queued',
  [DocumentStatus.PROCESSING]: 'processing',
  [DocumentStatus.DRAFT_READY]: 'draftReady',
  [DocumentStatus.FAILED]: 'failed',
};

const FILTERS = [
  DocumentStatus.QUEUED,
  DocumentStatus.PROCESSING,
  DocumentStatus.DRAFT_READY,
  DocumentStatus.FAILED,
] as const;

function StatusBadge({ status }: { status: number }) {
  const { t } = useTranslation('health');
  const key = STATUS_KEYS[status] ?? 'queued';
  const tone =
    status === DocumentStatus.DRAFT_READY
      ? 'sage'
      : status === DocumentStatus.FAILED
        ? 'coral'
        : 'brand';
  return <Badge tone={tone}>{t(`documentStatus.${key}`)}</Badge>;
}

function DocumentRow({
  document,
  clinicLabel,
  clinicView,
}: {
  document: MedicalDocument;
  clinicLabel: string;
  clinicView: boolean;
}) {
  const { t, i18n } = useTranslation('health');
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-4">
      <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-fg-muted">
        <DocumentIcon className="size-5" />
      </span>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="font-extrabold wrap-break-word text-fg">
              {document.originalName}
            </p>
            <p className="flex flex-wrap gap-x-4 text-sm text-fg-muted">
              <span>{formatDateTime(document.createdAt, i18n.language)}</span>
              <span>{formatBytes(document.sizeBytes, i18n.language)}</span>
              {!clinicView && <span>{clinicLabel}</span>}
            </p>
          </div>
          <StatusBadge status={document.status} />
        </div>
        {document.note && (
          <p className="text-sm whitespace-pre-line text-fg">
            {t('documents.note', { note: document.note })}
          </p>
        )}
        {document.status === DocumentStatus.FAILED &&
          document.failureReason && (
            <p className="text-sm font-semibold wrap-break-word text-danger">
              {documentFailureMessage(document.failureReason, t)}
            </p>
          )}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <DocumentActions
            documentId={document.id}
            fileName={document.originalName}
          />
          {clinicView && document.status === DocumentStatus.DRAFT_READY && (
            <Link
              to={`/clinic/drafts?pet=${document.petId}`}
              className="inline-flex min-h-11 items-center text-sm font-bold text-accent-fg underline-offset-4 hover:underline"
            >
              {t('documents.openDrafts')}
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function DocumentsPanel({
  petId,
  ownClinicId,
}: {
  petId: string;
  ownClinicId?: string;
}) {
  const { t } = useTranslation('health');
  const clinicView = Boolean(ownClinicId);
  const [status, setStatus] = useState<DocumentStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const documents = useDocuments(petId, {
    page,
    pageSize: HEALTH_PAGE_SIZE,
    status,
  });
  const clinicLabel = useClinicLabel(
    clinicView
      ? []
      : (documents.data?.documents.map((item) => item.clinicId) ?? []),
    ownClinicId,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Select
          label={t('documents.statusFilter')}
          name="documentStatus"
          value={status === undefined ? '' : String(status)}
          onChange={(e) => {
            setStatus(
              e.target.value
                ? (Number(e.target.value) as DocumentStatus)
                : undefined,
            );
            setPage(1);
          }}
          options={[
            { value: '', label: t('documents.allStatuses') },
            ...FILTERS.map((value) => ({
              value: String(value),
              label: t(`documentStatus.${STATUS_KEYS[value] ?? 'queued'}`),
            })),
          ]}
          className="sm:w-64"
        />
        {clinicView && (
          <p className="text-sm text-fg-muted sm:max-w-xs sm:text-right">
            {t('documents.clinicOnly')}
          </p>
        )}
      </div>
      {documents.isPending && <LoadingBlock />}
      {documents.isError && <ErrorAlert error={documents.error} />}
      {documents.isSuccess &&
        (documents.data.total === 0 ? (
          <HealthEmpty icon={<DocumentIcon className="size-6" />}>
            {status === undefined
              ? t('documents.empty')
              : t('documents.emptyFiltered')}
          </HealthEmpty>
        ) : (
          <div
            className={cn(
              'space-y-4 transition-opacity',
              documents.isPlaceholderData && 'opacity-60',
            )}
          >
            <ul className="divide-y divide-line border-y border-line">
              {documents.data.documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  clinicLabel={clinicLabel(document.clinicId)}
                  clinicView={clinicView}
                />
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCountOf(documents.data.total, HEALTH_PAGE_SIZE)}
              busy={documents.isFetching}
              onChange={setPage}
            />
          </div>
        ))}
    </div>
  );
}
