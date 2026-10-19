import type { SearchClinicPetsQuery } from '@/api/endpoints/pets';
import { PET_SPECIES } from '@/domain/constants';
import {
  normalizeChipNumber,
  normalizeWhitespace,
  validateChipNumber,
  validatePetName,
} from '@/domain/validation';
import { parsePage } from '@/lib/pagination';

export type SearchBy = 'name' | 'chip';

export interface PatientSearchParams {
  by: SearchBy;
  q: string;
  species: string;
  order: 'asc' | 'desc';
  page: number;
}

export function readSearchParams(params: URLSearchParams): PatientSearchParams {
  const species = params.get('species') ?? '';
  return {
    by: params.get('by') === 'chip' ? 'chip' : 'name',
    q: params.get('q') ?? '',
    species: (PET_SPECIES as readonly string[]).includes(species)
      ? species
      : '',
    order: params.get('order') === 'asc' ? 'asc' : 'desc',
    page: parsePage(params.get('page')),
  };
}

export function writeSearchParams(
  values: PatientSearchParams,
): URLSearchParams {
  const params = new URLSearchParams();
  if (values.q) {
    params.set('by', values.by);
    params.set('q', values.q);
  }
  if (values.species) params.set('species', values.species);
  if (values.order === 'asc') params.set('order', 'asc');
  if (values.page > 1) params.set('page', String(values.page));
  return params;
}

export function validateSearchTerm(by: SearchBy, raw: string): string | null {
  if (!raw.trim()) return null;
  if (by === 'chip') return validateChipNumber(raw);
  const code = validatePetName(raw);
  return code === 'PET_NAME_NOT_EMPTY' ? null : code;
}

export function normalizeSearchTerm(by: SearchBy, raw: string): string {
  return by === 'chip' ? normalizeChipNumber(raw) : normalizeWhitespace(raw);
}

export function toSearchQuery(
  values: PatientSearchParams,
  pageSize: number,
): SearchClinicPetsQuery {
  const valid = !validateSearchTerm(values.by, values.q);
  const term = valid ? normalizeSearchTerm(values.by, values.q) : '';
  return {
    ...(term && values.by === 'name' ? { name: term } : {}),
    ...(term && values.by === 'chip' ? { chipNumber: term } : {}),
    ...(values.species ? { species: values.species } : {}),
    orderFilter: values.order,
    page: values.page,
    pageSize,
  };
}
