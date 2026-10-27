import { api, apiBlob } from '../client';
import { ApiError, ClientErrorCode, isApiError } from '../errors';
import type {
  CreateRecordRequest,
  DocumentResponse,
  DocumentStatus,
  DraftReviewResponse,
  DraftReviewStatus,
  LabExplanationResponse,
  ListDocumentsResponse,
  ListDraftReviewsResponse,
  ListLabResultsResponse,
  ListPrescriptionsResponse,
  ListRecordsResponse,
  ListVaccinationsResponse,
  RecordResponse,
  RecordType,
  ReviewDraftRequest,
} from '../types';

function petPath(petId: string, rest: string): string {
  return `/pets/${encodeURIComponent(petId)}${rest}`;
}

export interface Paging {
  page: number;
  pageSize: number;
}

export interface ListRecordsQuery extends Paging {
  type?: RecordType;
  fromDate?: string;
  toDate?: string;
}

export function listRecords(
  petId: string,
  { page, pageSize, type, fromDate, toDate }: ListRecordsQuery,
  signal?: AbortSignal,
): Promise<ListRecordsResponse> {
  return api.get<ListRecordsResponse>(petPath(petId, '/records'), {
    query: { page, pageSize, type, fromDate, toDate },
    signal,
  });
}

export function listVaccinations(
  petId: string,
  { page, pageSize, onlyUpcoming }: Paging & { onlyUpcoming?: boolean },
  signal?: AbortSignal,
): Promise<ListVaccinationsResponse> {
  return api.get<ListVaccinationsResponse>(petPath(petId, '/vaccinations'), {
    query: {
      page,
      pageSize,
      onlyUpcoming: onlyUpcoming ? 'true' : undefined,
    },
    signal,
  });
}

export function listPrescriptions(
  petId: string,
  { page, pageSize, onlyActive }: Paging & { onlyActive?: boolean },
  signal?: AbortSignal,
): Promise<ListPrescriptionsResponse> {
  return api.get<ListPrescriptionsResponse>(petPath(petId, '/prescriptions'), {
    query: { page, pageSize, onlyActive: onlyActive ? 'true' : undefined },
    signal,
  });
}

export function listLabResults(
  petId: string,
  { page, pageSize, testName }: Paging & { testName?: string },
  signal?: AbortSignal,
): Promise<ListLabResultsResponse> {
  return api.get<ListLabResultsResponse>(petPath(petId, '/lab-results'), {
    query: { page, pageSize, testName },
    signal,
  });
}

export function getLabExplanation(
  recordId: string,
  signal?: AbortSignal,
): Promise<LabExplanationResponse> {
  return api.get<LabExplanationResponse>(
    `/records/${encodeURIComponent(recordId)}/explanation`,
    { signal },
  );
}

export function createRecord(
  petId: string,
  request: CreateRecordRequest,
): Promise<RecordResponse> {
  return api.post<RecordResponse>(petPath(petId, '/records'), request);
}

export function getDocument(
  id: string,
  signal?: AbortSignal,
): Promise<DocumentResponse> {
  return api.get<DocumentResponse>(`/documents/${encodeURIComponent(id)}`, {
    signal,
  });
}

export function listDocuments(
  petId: string,
  { page, pageSize, status }: Paging & { status?: DocumentStatus },
  signal?: AbortSignal,
): Promise<ListDocumentsResponse> {
  return api.get<ListDocumentsResponse>(petPath(petId, '/documents'), {
    query: { page, pageSize, status },
    signal,
  });
}

export const FILE_TIMEOUT_MS = 60_000;

export const FILE_INTERCEPTED = 'FILE_INTERCEPTED';

const FILE_ATTEMPTS = 2;

async function fetchDocumentFile(id: string, download: boolean): Promise<Blob> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await apiBlob(`/documents/${encodeURIComponent(id)}/file`, {
        query: { download: download ? 1 : undefined },
        timeoutMs: FILE_TIMEOUT_MS,
      });
    } catch (error) {
      const dropped =
        isApiError(error) && error.code === ClientErrorCode.NETWORK_ERROR;
      if (!dropped || attempt >= FILE_ATTEMPTS) throw error;
    }
  }
}

export async function getDocumentFile(
  id: string,
  { download = false }: { download?: boolean } = {},
): Promise<Blob> {
  let blob: Blob;
  try {
    blob = await fetchDocumentFile(id, download);
  } catch (error) {
    if (isApiError(error) && error.isNetworkError) {
      throw new ApiError({ status: 0, code: FILE_INTERCEPTED, cause: error });
    }
    throw error;
  }
  if (blob.size === 0) {
    throw new ApiError({ status: 0, code: FILE_INTERCEPTED });
  }
  return blob;
}

export interface ListDraftReviewsQuery extends Paging {
  petId?: string;
  status?: DraftReviewStatus;
}

export function listDraftReviews(
  { page, pageSize, petId, status }: ListDraftReviewsQuery,
  signal?: AbortSignal,
): Promise<ListDraftReviewsResponse> {
  return api.get<ListDraftReviewsResponse>('/draft-reviews', {
    query: { page, pageSize, petId, status },
    signal,
  });
}

export function reviewDraft(
  id: string,
  request: ReviewDraftRequest,
): Promise<DraftReviewResponse> {
  return api.post<DraftReviewResponse>(
    `/draft-reviews/${encodeURIComponent(id)}/review`,
    request,
  );
}
