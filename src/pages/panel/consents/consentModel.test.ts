import { describe, expect, it } from 'vitest';
import type { Consent } from '@/api/types';
import {
  initialGrantDetails,
  normalizeClinicCode,
  toGrantRequest,
  validateClinicCode,
  validateGrantDetails,
} from './consentModel';

const TODAY = '2026-10-13';
const CLINIC = '3f1c2a4e-8b7d-4c1e-9a2b-1234567890ab';
const PET = '9a8b7c6d-5e4f-4a3b-8c2d-0987654321fe';

function consent(overrides: Partial<Consent>): Consent {
  return {
    consentId: 'c1',
    status: 1,
    ownerUserId: 'o1',
    clinicId: CLINIC,
    petId: PET,
    scopes: ['vaccination_read', 'medical_read'],
    grantedAt: '2026-09-01T10:00:00.000Z',
    expiresAt: '2026-12-31T20:59:59.000Z',
    revokedAt: '',
    ...overrides,
  };
}

describe('klinik kodu', () => {
  it('boşlukları ve büyük harfleri temizler', () => {
    expect(normalizeClinicCode(` ${CLINIC.toUpperCase()} `)).toBe(CLINIC);
  });

  it.each([
    ['', 'CLINIC_ID_NOT_EMPTY'],
    ['abc', 'CLINIC_ID_WRONG DATA FORMAT'],
    ['3f1c2a4e-8b7d-1c1e-9a2b-1234567890ab', 'CLINIC_ID_WRONG DATA FORMAT'],
    [CLINIC, null],
  ])('%s -> %s', (input, expected) => {
    expect(validateClinicCode(input)).toBe(expected);
  });
});

describe('initialGrantDetails', () => {
  it('izin yoksa boş seçim ve 1 ay', () => {
    expect(initialGrantDetails(undefined, TODAY)).toEqual({
      scopes: [],
      duration: 'month',
      customDate: '',
    });
    expect(
      initialGrantDetails(consent({ status: 4, scopes: [] }), TODAY),
    ).toEqual({ scopes: [], duration: 'month', customDate: '' });
  });

  it('aktif izinden kapsamları ve bitiş gününü (İstanbul) alır', () => {
    expect(initialGrantDetails(consent({}), TODAY)).toEqual({
      scopes: ['medical_read', 'vaccination_read'],
      duration: 'custom',
      customDate: '2026-12-31',
    });
  });

  it('iptal edilmiş izinden yalnızca kapsamları alır', () => {
    expect(initialGrantDetails(consent({ status: 2 }), TODAY)).toEqual({
      scopes: ['medical_read', 'vaccination_read'],
      duration: 'month',
      customDate: '',
    });
  });
});

describe('validateGrantDetails', () => {
  it('en az bir kapsam ve geçerli tarih ister', () => {
    expect(
      validateGrantDetails(
        { scopes: [], duration: 'custom', customDate: '2028-01-01' },
        TODAY,
      ),
    ).toEqual({ scopes: 'SCOPES_MIN|1', endDate: 'CONSENT_TOO_LONG' });
    expect(
      validateGrantDetails(
        { scopes: ['medical_read'], duration: 'year', customDate: '' },
        TODAY,
      ),
    ).toEqual({});
  });
});

describe('toGrantRequest', () => {
  it('kapsamları sabit sırada ve bitişi gün sonu olarak gönderir', () => {
    expect(
      toGrantRequest(
        CLINIC,
        PET,
        {
          scopes: ['owner_contact_read', 'medical_read'],
          duration: 'week',
          customDate: '',
        },
        TODAY,
      ),
    ).toEqual({
      clinicId: CLINIC,
      petId: PET,
      scopes: ['medical_read', 'owner_contact_read'],
      expiresAt: '2026-10-20T23:59:59+03:00',
    });
  });
});
