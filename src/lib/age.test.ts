import { describe, expect, it } from 'vitest';
import { ageFromBirthDate, birthDateFromAge } from './age';

describe('ageFromBirthDate', () => {
  it.each([
    ['2023-10-12', '2026-10-12', { years: 3, months: 0 }],
    ['2023-10-13', '2026-10-12', { years: 2, months: 11 }],
    ['2026-05-01', '2026-10-12', { years: 0, months: 5 }],
    ['2026-10-12', '2026-10-12', { years: 0, months: 0 }],
  ])('%s -> %s', (birth, today, expected) => {
    expect(ageFromBirthDate(birth, today)).toEqual(expected);
  });

  it('geçersiz ya da ileri tarih için null', () => {
    expect(ageFromBirthDate('', '2026-10-12')).toBeNull();
    expect(ageFromBirthDate('2027-01-01', '2026-10-12')).toBeNull();
  });
});

describe('birthDateFromAge', () => {
  it('yıl ve aydan doğum tarihi hesaplar', () => {
    expect(birthDateFromAge({ years: 3, months: 0 }, '2026-10-12')).toBe(
      '2023-10-12',
    );
    expect(birthDateFromAge({ years: 0, months: 11 }, '2026-10-12')).toBe(
      '2025-11-12',
    );
    expect(birthDateFromAge({ years: 1, months: 2 }, '2026-01-15')).toBe(
      '2024-11-15',
    );
  });

  it('ay sonu günü kısaltır', () => {
    expect(birthDateFromAge({ years: 0, months: 1 }, '2026-03-31')).toBe(
      '2026-02-28',
    );
  });

  it('hesaplanan tarih yaşa geri çevrildiğinde aynı yaşı verir', () => {
    const today = '2026-10-12';
    const birth = birthDateFromAge({ years: 4, months: 7 }, today);
    expect(ageFromBirthDate(birth, today)).toEqual({ years: 4, months: 7 });
  });
});
