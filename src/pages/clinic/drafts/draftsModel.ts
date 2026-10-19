import { DraftReviewStatus } from '@/api/types';
import { isUuidV4 } from '@/lib/ids';
import { parsePage } from '@/lib/pagination';

export const DRAFT_FILTERS = [
  'pending',
  'approved',
  'rejected',
  'all',
] as const;
export type DraftFilter = (typeof DRAFT_FILTERS)[number];

const FILTER_STATUS: Record<DraftFilter, DraftReviewStatus | undefined> = {
  pending: DraftReviewStatus.PENDING,
  approved: DraftReviewStatus.APPROVED,
  rejected: DraftReviewStatus.REJECTED,
  all: undefined,
};

export function statusOf(filter: DraftFilter): DraftReviewStatus | undefined {
  return FILTER_STATUS[filter];
}

export interface DraftFilters {
  filter: DraftFilter;
  petId: string;
  page: number;
}

export function readDraftFilters(params: URLSearchParams): DraftFilters {
  const filter = params.get('status') ?? 'pending';
  const petId = params.get('pet') ?? '';
  return {
    filter: (DRAFT_FILTERS as readonly string[]).includes(filter)
      ? (filter as DraftFilter)
      : 'pending',
    petId: isUuidV4(petId) ? petId : '',
    page: parsePage(params.get('page')),
  };
}

export function writeDraftFilters(filters: DraftFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.filter !== 'pending') params.set('status', filters.filter);
  if (filters.petId) params.set('pet', filters.petId);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export const REVIEW_NOTE_MAX = 500;

export function validateReviewNote(raw: string, approved: boolean) {
  const value = raw.trim();
  if (!value) return approved ? null : 'REVIEW_NOTE_NOT_EMPTY';
  if (value.length > REVIEW_NOTE_MAX) {
    return `REVIEW_NOTE_MAX_LENGTH|${REVIEW_NOTE_MAX}`;
  }
  if (
    [...value].some(
      (char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f,
    )
  ) {
    return 'REVIEW_NOTE_WRONG DATA FORMAT';
  }
  return null;
}
