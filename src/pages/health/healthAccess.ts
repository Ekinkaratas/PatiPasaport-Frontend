export type HealthTab =
  | 'records'
  | 'vaccinations'
  | 'prescriptions'
  | 'labResults'
  | 'documents'
  | 'assessment';

export type HealthAccess = Record<HealthTab, boolean>;

export const FULL_HEALTH_ACCESS: HealthAccess = {
  records: true,
  vaccinations: true,
  prescriptions: true,
  labResults: true,
  documents: true,
  assessment: true,
};

export const NO_HEALTH_ACCESS: HealthAccess = {
  records: false,
  vaccinations: false,
  prescriptions: false,
  labResults: false,
  documents: false,
  assessment: false,
};

export function accessFromScopes(scopes: readonly string[]): HealthAccess {
  return {
    records: scopes.includes('medical_read'),
    vaccinations: scopes.includes('vaccination_read'),
    prescriptions: scopes.includes('prescription_read'),
    labResults: scopes.includes('medical_read'),
    documents: scopes.includes('medical_write'),
    assessment: scopes.includes('medical_read'),
  };
}

export function canWriteRecords(scopes: readonly string[]): boolean {
  return scopes.includes('medical_write');
}
