import {
  ConsentStatus,
  type Consent,
  type GrantConsentRequest,
} from '@/api/types';
import { CONSENT_SCOPES, BUSINESS_TIME_ZONE } from '@/domain/constants';
import {
  durationEndDate,
  toExpiresAt,
  validateConsentEndDate,
  type ConsentDuration,
} from '@/lib/consentExpiry';
import { isUuidV4 } from '@/lib/ids';

export function normalizeClinicCode(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

export function validateClinicCode(value: string): string | null {
  const code = normalizeClinicCode(value);
  if (!code) return 'CLINIC_ID_NOT_EMPTY';
  if (!isUuidV4(code)) return 'CLINIC_ID_WRONG DATA FORMAT';
  return null;
}

export interface GrantDetailsValues {
  scopes: string[];
  duration: ConsentDuration;
  customDate: string;
}

export type GrantDetailsField = 'scopes' | 'endDate';

export function dateInBusinessTimeZone(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

export function initialGrantDetails(
  existing: Consent | undefined,
  today: string,
): GrantDetailsValues {
  if (!existing || existing.status === ConsentStatus.NOT_FOUND) {
    return { scopes: [], duration: 'month', customDate: '' };
  }
  const scopes = CONSENT_SCOPES.filter((scope) =>
    existing.scopes.includes(scope),
  );
  if (existing.status === ConsentStatus.ACTIVE && existing.expiresAt) {
    const endDate = dateInBusinessTimeZone(existing.expiresAt);
    if (endDate >= today) {
      return { scopes, duration: 'custom', customDate: endDate };
    }
  }
  return { scopes, duration: 'month', customDate: '' };
}

export function endDateOf(values: GrantDetailsValues, today: string): string {
  return values.duration === 'custom'
    ? values.customDate
    : durationEndDate(values.duration, today);
}

export function validateGrantDetails(
  values: GrantDetailsValues,
  today: string,
): Partial<Record<GrantDetailsField, string>> {
  const errors: Partial<Record<GrantDetailsField, string>> = {};
  if (values.scopes.length === 0) errors.scopes = 'SCOPES_MIN|1';
  const dateError = validateConsentEndDate(endDateOf(values, today), today);
  if (dateError) errors.endDate = dateError;
  return errors;
}

export function toGrantRequest(
  clinicId: string,
  petId: string,
  values: GrantDetailsValues,
  today: string,
): GrantConsentRequest {
  return {
    clinicId,
    petId,
    scopes: CONSENT_SCOPES.filter((scope) => values.scopes.includes(scope)),
    expiresAt: toExpiresAt(endDateOf(values, today)),
  };
}
