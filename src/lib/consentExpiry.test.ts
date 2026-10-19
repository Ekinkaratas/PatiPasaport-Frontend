import { describe, expect, it } from 'vitest';
import {
  addMonths,
  durationEndDate,
  maxConsentDate,
  toExpiresAt,
  validateConsentEndDate,
} from './consentExpiry';

const TODAY = '2026-10-13';

describe('consentExpiry', () => {
  it('ay eklerken ay sonunu kısaltır', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-10-13', 3)).toBe('2027-01-13');
  });

  it('hazır süreleri hesaplar; 1 yıl sınırı aşılmaz', () => {
    expect(durationEndDate('today', TODAY)).toBe(TODAY);
    expect(durationEndDate('week', TODAY)).toBe('2026-10-20');
    expect(durationEndDate('month', TODAY)).toBe('2026-11-13');
    expect(durationEndDate('year', TODAY)).toBe('2027-10-12');
    expect(maxConsentDate(TODAY)).toBe('2027-10-12');
  });

  it('bitiş anı seçilen günün sonu, Türkiye saatiyle', () => {
    expect(toExpiresAt('2026-11-13')).toBe('2026-11-13T23:59:59+03:00');
  });

  it('bitiş tarihini doğrular', () => {
    expect(validateConsentEndDate('', TODAY)).toBe('EXPIRES_AT_NOT_EMPTY');
    expect(validateConsentEndDate('2026-10-12', TODAY)).toBe(
      'EXPIRES_AT_CANNOT_BE_PAST',
    );
    expect(validateConsentEndDate('2027-10-13', TODAY)).toBe(
      'CONSENT_TOO_LONG',
    );
    expect(validateConsentEndDate(TODAY, TODAY)).toBeNull();
    expect(validateConsentEndDate('2027-10-12', TODAY)).toBeNull();
  });
});
