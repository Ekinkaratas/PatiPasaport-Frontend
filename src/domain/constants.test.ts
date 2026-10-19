import { describe, expect, it } from 'vitest';
import { PET_BREEDS, PET_SPECIES } from './constants';

describe('PET_BREEDS', () => {
  it('her türün cins listesi var ve MIXED içeriyor', () => {
    expect(Object.keys(PET_BREEDS).sort()).toEqual([...PET_SPECIES].sort());
    for (const species of PET_SPECIES) {
      expect(PET_BREEDS[species]).toContain('MIXED');
    }
  });
});
