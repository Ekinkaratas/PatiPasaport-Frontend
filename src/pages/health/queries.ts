import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { getClinic } from '@/api/endpoints/clinics';
import {
  getDocument,
  getLabExplanation,
  listDocuments,
  listDraftReviews,
  listLabResults,
  listPrescriptions,
  listRecords,
  listVaccinations,
  type ListDraftReviewsQuery,
  type ListRecordsQuery,
  type Paging,
} from '@/api/endpoints/records';
import { isApiError } from '@/api/errors';
import {
  DocumentStatus,
  LabExplanationStatus,
  type ListDocumentsResponse,
} from '@/api/types';
import { isUuidV4 } from '@/lib/ids';

export const HEALTH_PAGE_SIZE = 8;
export const DRAFTS_PAGE_SIZE = 8;

export const healthKeys = {
  all: ['health'] as const,
  pet: (petId: string) => ['health', 'pet', petId] as const,
  records: (petId: string, query: ListRecordsQuery) =>
    ['health', 'pet', petId, 'records', query] as const,
  vaccinations: (petId: string, query: Paging & { onlyUpcoming?: boolean }) =>
    ['health', 'pet', petId, 'vaccinations', query] as const,
  prescriptions: (petId: string, query: Paging & { onlyActive?: boolean }) =>
    ['health', 'pet', petId, 'prescriptions', query] as const,
  labResults: (petId: string, query: Paging & { testName?: string }) =>
    ['health', 'pet', petId, 'lab-results', query] as const,
  documents: (petId: string, query: Paging & { status?: DocumentStatus }) =>
    ['health', 'pet', petId, 'documents', query] as const,
  drafts: (query: ListDraftReviewsQuery) =>
    ['health', 'drafts', query] as const,
  draftsAll: ['health', 'drafts'] as const,
  document: (id: string) => ['health', 'document', id] as const,
  clinic: (id: string) => ['health', 'clinic', id] as const,
  explanation: (recordId: string) =>
    ['health', 'record', recordId, 'explanation'] as const,
};

export function useRecords(
  petId: string,
  query: ListRecordsQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: healthKeys.records(petId, query),
    queryFn: ({ signal }) => listRecords(petId, query, signal),
    placeholderData: keepPreviousData,
    enabled: enabled && isUuidV4(petId),
  });
}

export function useVaccinations(
  petId: string,
  query: Paging & { onlyUpcoming?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: healthKeys.vaccinations(petId, query),
    queryFn: ({ signal }) => listVaccinations(petId, query, signal),
    placeholderData: keepPreviousData,
    enabled: enabled && isUuidV4(petId),
  });
}

export function usePrescriptions(
  petId: string,
  query: Paging & { onlyActive?: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: healthKeys.prescriptions(petId, query),
    queryFn: ({ signal }) => listPrescriptions(petId, query, signal),
    placeholderData: keepPreviousData,
    enabled: enabled && isUuidV4(petId),
  });
}

export function useLabResults(
  petId: string,
  query: Paging & { testName?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: healthKeys.labResults(petId, query),
    queryFn: ({ signal }) => listLabResults(petId, query, signal),
    placeholderData: keepPreviousData,
    enabled: enabled && isUuidV4(petId),
  });
}

export function useLabExplanation(recordId: string, enabled = true) {
  return useQuery({
    queryKey: healthKeys.explanation(recordId),
    queryFn: ({ signal }) => getLabExplanation(recordId, signal),
    enabled: enabled && isUuidV4(recordId),
    retry: (failureCount, error) =>
      !(isApiError(error) && error.status >= 400 && error.status < 500) &&
      failureCount < 2,
    refetchInterval: (query) =>
      query.state.data?.status === LabExplanationStatus.PENDING ? 5_000 : false,
  });
}

export function useDocuments(
  petId: string,
  query: Paging & { status?: DocumentStatus },
  enabled = true,
) {
  return useQuery({
    queryKey: healthKeys.documents(petId, query),
    queryFn: ({ signal }) => listDocuments(petId, query, signal),
    placeholderData: keepPreviousData,
    enabled: enabled && isUuidV4(petId),
    refetchInterval: (state) =>
      hasOpenDocument(state.state.data) ? 15_000 : false,
  });
}

function hasOpenDocument(data: ListDocumentsResponse | undefined): boolean {
  return Boolean(
    data?.documents.some((document) =>
      OPEN_DOCUMENT_STATUSES.includes(document.status),
    ),
  );
}

export function useDraftReviews(query: ListDraftReviewsQuery) {
  return useQuery({
    queryKey: healthKeys.drafts(query),
    queryFn: ({ signal }) => listDraftReviews(query, signal),
    placeholderData: keepPreviousData,
  });
}

const OPEN_DOCUMENT_STATUSES: number[] = [
  DocumentStatus.QUEUED,
  DocumentStatus.PROCESSING,
];

export function useDocumentStatus(id: string | null) {
  return useQuery({
    queryKey: healthKeys.document(id ?? ''),
    queryFn: ({ signal }) =>
      getDocument(id ?? '', signal).then((res) => res.document),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data &&
      OPEN_DOCUMENT_STATUSES.includes(query.state.data.status)
        ? 10_000
        : false,
  });
}

export function useClinicNames(
  clinicIds: string[],
): Record<string, string | null | undefined> {
  const unique = [...new Set(clinicIds.filter(isUuidV4))];
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: healthKeys.clinic(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getClinic(id, signal).then((res) => res.clinic.name),
      retry: false,
      staleTime: 10 * 60_000,
    })),
  });
  return Object.fromEntries(
    unique.map((id, index) => {
      const result = results[index];
      if (result?.isSuccess) return [id, result.data];
      if (result?.isError && isApiError(result.error)) return [id, null];
      return [id, undefined];
    }),
  );
}
