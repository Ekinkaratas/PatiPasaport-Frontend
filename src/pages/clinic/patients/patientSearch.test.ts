import { describe, expect, it } from 'vitest';
import {
  readSearchParams,
  toSearchQuery,
  validateSearchTerm,
  writeSearchParams,
} from './patientSearch';

describe('hasta arama parametreleri', () => {
  it('geçersiz değerleri varsayılana çevirir', () => {
    expect(
      readSearchParams(
        new URLSearchParams('by=x&species=DRAGON&order=up&page=-3&q=Pamuk'),
      ),
    ).toEqual({ by: 'name', q: 'Pamuk', species: '', order: 'desc', page: 1 });
  });

  it('yazıp okuyunca aynı değerleri verir', () => {
    const values = {
      by: 'chip' as const,
      q: '792000000004821',
      species: 'CAT',
      order: 'asc' as const,
      page: 3,
    };
    expect(readSearchParams(writeSearchParams(values))).toEqual(values);
  });

  it('ad ve çipten yalnızca birini gönderir', () => {
    expect(
      toSearchQuery(
        {
          by: 'name',
          q: '  Pamuk  Hanım ',
          species: '',
          order: 'desc',
          page: 1,
        },
        16,
      ),
    ).toEqual({
      name: 'Pamuk Hanım',
      orderFilter: 'desc',
      page: 1,
      pageSize: 16,
    });
    expect(
      toSearchQuery(
        {
          by: 'chip',
          q: '792 000 000 004 821',
          species: 'CAT',
          order: 'asc',
          page: 2,
        },
        16,
      ),
    ).toEqual({
      chipNumber: '792000000004821',
      species: 'CAT',
      orderFilter: 'asc',
      page: 2,
      pageSize: 16,
    });
  });

  it('geçersiz arama terimi gönderilmez', () => {
    expect(validateSearchTerm('chip', '123')).toBe(
      'CHIP_NUMBER_WRONG DATA FORMAT',
    );
    expect(validateSearchTerm('name', "Pam'uk")).toBe(
      'PET_NAME_WRONG DATA FORMAT',
    );
    expect(validateSearchTerm('name', '')).toBeNull();
    expect(
      toSearchQuery(
        { by: 'chip', q: '123', species: '', order: 'desc', page: 1 },
        16,
      ),
    ).toEqual({ orderFilter: 'desc', page: 1, pageSize: 16 });
  });
});
