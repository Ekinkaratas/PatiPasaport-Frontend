import { describe, expect, it } from 'vitest';
import { DraftReviewStatus } from '@/api/types';
import {
  readDraftFilters,
  statusOf,
  validateReviewNote,
  writeDraftFilters,
} from './draftsModel';

const PET = '0f8c7a51-7f0e-4c43-9a55-5d3f8f1a2b01';

describe('taslak filtreleri', () => {
  it('varsayılan bekleyenlerdir; URL ile gidip gelir', () => {
    expect(readDraftFilters(new URLSearchParams())).toEqual({
      filter: 'pending',
      petId: '',
      page: 1,
    });
    const filters = { filter: 'approved' as const, petId: PET, page: 2 };
    expect(readDraftFilters(writeDraftFilters(filters))).toEqual(filters);
    expect(readDraftFilters(new URLSearchParams('status=x&pet=abc'))).toEqual({
      filter: 'pending',
      petId: '',
      page: 1,
    });
  });

  it('filtreyi taslak durumuna çevirir', () => {
    expect(statusOf('pending')).toBe(DraftReviewStatus.PENDING);
    expect(statusOf('rejected')).toBe(DraftReviewStatus.REJECTED);
    expect(statusOf('all')).toBeUndefined();
  });

  it('reddederken not zorunlu, tek satır ve en fazla 500 karakter', () => {
    expect(validateReviewNote('  ', false)).toBe('REVIEW_NOTE_NOT_EMPTY');
    expect(validateReviewNote('', true)).toBeNull();
    expect(validateReviewNote('a\nb', true)).toBe(
      'REVIEW_NOTE_WRONG DATA FORMAT',
    );
    expect(validateReviewNote('a'.repeat(501), true)).toBe(
      'REVIEW_NOTE_MAX_LENGTH|500',
    );
  });
});
