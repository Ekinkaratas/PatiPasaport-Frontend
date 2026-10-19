import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DraftReviewStatus, type DraftReview } from '@/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorAlert } from '@/components/ui/ErrorAlert';
import { DocumentIcon, XIcon } from '@/components/ui/icons';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { pageCountOf } from '@/lib/pagination';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import { DocumentActions } from '../../health/DocumentActions';
import { DRAFTS_PAGE_SIZE, useDraftReviews } from '../../health/queries';
import { RecordTypeBadge } from '../../health/RecordDetails';
import { usePatientsByIds } from '../queries';
import { DraftReviewModal } from './DraftReviewModal';
import {
  DRAFT_FILTERS,
  readDraftFilters,
  statusOf,
  writeDraftFilters,
  type DraftFilters,
} from './draftsModel';

function StatusBadge({ status }: { status: number }) {
  const { t } = useTranslation('health');
  if (status === DraftReviewStatus.APPROVED) {
    return <Badge tone="sage">{t('draftStatus.approved')}</Badge>;
  }
  if (status === DraftReviewStatus.REJECTED) {
    return <Badge tone="coral">{t('draftStatus.rejected')}</Badge>;
  }
  return <Badge tone="brand">{t('draftStatus.pending')}</Badge>;
}

function DraftCard({
  draft,
  petName,
  onReview,
}: {
  draft: DraftReview;
  petName: string;
  onReview: () => void;
}) {
  const { t, i18n } = useTranslation('health');
  const source = draft.sourceFiles[0];
  const content = draft.approvedContent ?? draft.proposal;

  return (
    <li className="space-y-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-cream-300/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/clinic/patients/${draft.petId}`}
            className="text-lg font-extrabold text-cocoa-900 hover:text-brand-700"
          >
            {petName}
          </Link>
          <p className="text-sm text-cocoa-500">
            {formatDateTime(draft.createdAt, i18n.language)}
          </p>
        </div>
        <StatusBadge status={draft.status} />
      </div>
      {content && (
        <div className="flex flex-wrap items-center gap-2">
          <RecordTypeBadge type={content.type} />
          <span className="font-bold text-cocoa-800">
            {content.title || t('drafts.untitled')}
          </span>
          {content.recordedAt && (
            <span className="text-sm text-cocoa-500">
              {formatDate(content.recordedAt, i18n.language, {
                dateStyle: 'medium',
              })}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm text-cocoa-600">
          <DocumentIcon className="size-4 shrink-0" />
          <span className="truncate">{source?.originalName || '—'}</span>
        </p>
        {source?.documentId && (
          <DocumentActions
            documentId={source.documentId}
            fileName={source.originalName || source.documentId}
          />
        )}
      </div>
      {draft.reviewNote && (
        <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-cocoa-700">
          {t('drafts.reviewNote', { note: draft.reviewNote })}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-cream-200 pt-3">
        {draft.status === DraftReviewStatus.APPROVED && (
          <Link
            to={`/clinic/patients/${draft.petId}`}
            className="text-sm font-bold text-brand-700 hover:underline"
          >
            {t('drafts.openPatient')}
          </Link>
        )}
        {draft.status === DraftReviewStatus.PENDING && (
          <Button size="sm" onClick={onReview}>
            {t('drafts.review')}
          </Button>
        )}
      </div>
    </li>
  );
}

export function DraftsPage() {
  const { t } = useTranslation('health');
  useDocumentTitle(t('drafts.pageTitle'));
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readDraftFilters(searchParams);
  const [reviewing, setReviewing] = useState<DraftReview | null>(null);
  const drafts = useDraftReviews({
    page: filters.page,
    pageSize: DRAFTS_PAGE_SIZE,
    status: statusOf(filters.filter),
    petId: filters.petId || undefined,
  });
  const petIds = [
    ...(drafts.data?.draftReviews.map((draft) => draft.petId) ?? []),
    ...(filters.petId ? [filters.petId] : []),
  ];
  const pets = usePatientsByIds(petIds);
  const nameOf = (petId: string) => {
    const pet = pets[petId];
    if (pet === undefined) return '…';
    return pet?.name ?? t('drafts.unknownPet');
  };
  const apply = (next: Partial<DraftFilters>) =>
    setSearchParams(writeDraftFilters({ ...filters, page: 1, ...next }));
  const pageCount = drafts.isSuccess
    ? pageCountOf(drafts.data.total, DRAFTS_PAGE_SIZE)
    : 0;

  if (drafts.isSuccess && pageCount > 0 && filters.page > pageCount) {
    return (
      <Navigate
        replace
        to={{
          search: writeDraftFilters({ ...filters, page: pageCount }).toString(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('drafts.title')} lead={t('drafts.lead')} />
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label={t('drafts.filterLabel')}
          className="inline-flex flex-wrap gap-1 rounded-full bg-cream-200 p-1"
        >
          {DRAFT_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={filters.filter === filter}
              onClick={() => apply({ filter })}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-bold transition-colors',
                filters.filter === filter
                  ? 'bg-white text-cocoa-900 shadow-sm'
                  : 'text-cocoa-600 hover:text-cocoa-900',
              )}
            >
              {t(`drafts.filters.${filter}`)}
            </button>
          ))}
        </div>
        {filters.petId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-1 pr-1 pl-3 text-sm font-bold text-brand-800">
            {t('drafts.petFilter', { name: nameOf(filters.petId) })}
            <button
              type="button"
              aria-label={t('drafts.clearPet')}
              onClick={() => apply({ petId: '' })}
              className="rounded-full p-1 hover:bg-brand-200"
            >
              <XIcon className="size-4" />
            </button>
          </span>
        )}
      </div>
      <p className="rounded-2xl bg-cream-200/60 px-4 py-3 text-sm text-cocoa-600 ring-1 ring-cream-300/60">
        {t('drafts.aiNote')}
      </p>
      {drafts.isPending && <LoadingBlock />}
      {drafts.isError && <ErrorAlert error={drafts.error} />}
      {drafts.isSuccess &&
        (drafts.data.total === 0 ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-14 text-center shadow-soft ring-1 ring-cream-300/60">
            <span className="grid size-16 place-items-center rounded-2xl bg-cream-200 text-cocoa-500">
              <DocumentIcon className="size-9" />
            </span>
            <h2 className="mt-5 text-xl font-extrabold text-cocoa-900">
              {t(`drafts.empty.${filters.filter}`)}
            </h2>
            <p className="mt-2 max-w-md text-cocoa-600">
              {t('drafts.emptyBody')}
            </p>
          </div>
        ) : (
          <>
            <ul
              className={cn(
                'space-y-3 transition-opacity',
                drafts.isPlaceholderData && 'opacity-60',
              )}
            >
              {drafts.data.draftReviews.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  petName={nameOf(draft.petId)}
                  onReview={() => setReviewing(draft)}
                />
              ))}
            </ul>
            <Pagination
              page={filters.page}
              pageCount={pageCount}
              busy={drafts.isFetching}
              onChange={(page) =>
                setSearchParams(writeDraftFilters({ ...filters, page }))
              }
            />
          </>
        ))}
      {reviewing && (
        <DraftReviewModal
          key={reviewing.id}
          draft={reviewing}
          petName={nameOf(reviewing.petId)}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}
