import {
  PetSex,
  type CreatePetRequest,
  type Pet,
  type UpdatePetRequest,
} from '@/api/types';
import { PET_BREEDS, PET_SPECIES, type PetSpecies } from '@/domain/constants';
import {
  normalizeChipNumber,
  normalizeWhitespace,
  validateBirthDate,
  validateChipNumber,
  validateEstimatedAge,
  validatePetName,
} from '@/domain/validation';
import { ageFromBirthDate, birthDateFromAge } from '@/lib/age';

export type BirthMode = 'exact' | 'estimated' | 'unknown';

export interface PetFormValues {
  name: string;
  species: string;
  breed: string;
  sex: string;
  birthMode: BirthMode;
  birthDate: string;
  ageYears: string;
  ageMonths: string;
  isNeutered: boolean;
  chipNumber: string;
}

export type PetFormField =
  'name' | 'species' | 'breed' | 'sex' | 'birthDate' | 'age' | 'chipNumber';

export type PetFormErrors = Partial<Record<PetFormField, string>>;

export type PetFormMode = 'create' | 'edit';

export function isPetSpecies(value: string): value is PetSpecies {
  return (PET_SPECIES as readonly string[]).includes(value);
}

export function breedsOf(species: string): readonly string[] {
  return isPetSpecies(species) ? PET_BREEDS[species] : [];
}

export function emptyPetForm(): PetFormValues {
  return {
    name: '',
    species: '',
    breed: '',
    sex: '',
    birthMode: 'exact',
    birthDate: '',
    ageYears: '',
    ageMonths: '',
    isNeutered: false,
    chipNumber: '',
  };
}

export function petToFormValues(pet: Pet, today: string): PetFormValues {
  const age = pet.birthDate ? ageFromBirthDate(pet.birthDate, today) : null;
  const birthMode: BirthMode = !pet.birthDate
    ? 'unknown'
    : pet.isBirthDateEstimated
      ? 'estimated'
      : 'exact';
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: String(pet.sex),
    birthMode,
    birthDate: pet.birthDate,
    ageYears: age ? String(age.years) : '',
    ageMonths: age ? String(age.months) : '',
    isNeutered: pet.isNeutered,
    chipNumber: pet.chipNumber,
  };
}

export function validatePetForm(
  values: PetFormValues,
  today: string,
  mode: PetFormMode,
  original?: Pet,
): PetFormErrors {
  const errors: PetFormErrors = {};
  const set = (field: PetFormField, code: string | null) => {
    if (code) errors[field] = code;
  };

  set('name', validatePetName(values.name));

  if (mode === 'create') {
    if (!values.species) set('species', 'SPECIES_NOT_EMPTY');
    else if (!isPetSpecies(values.species)) set('species', 'SPECIES_NOT_VALID');
    if (
      values.sex !== String(PetSex.MALE) &&
      values.sex !== String(PetSex.FEMALE)
    ) {
      set('sex', 'SEX_NOT_EMPTY');
    }
  }

  if (!values.breed) set('breed', 'BREED_NOT_EMPTY');
  else if (
    isPetSpecies(values.species) &&
    !breedsOf(values.species).includes(values.breed)
  ) {
    set('breed', 'BREED_NOT_VALID');
  }

  if (values.birthMode === 'exact') {
    set('birthDate', validateBirthDate(values.birthDate, today));
  } else if (values.birthMode === 'estimated') {
    set('age', validateEstimatedAge(values.ageYears, values.ageMonths));
  } else if (mode === 'edit' && original?.birthDate) {
    set('birthDate', 'BIRTH_DATE_CANNOT_REMOVE');
  }

  set('chipNumber', validateChipNumber(values.chipNumber));
  if (
    mode === 'edit' &&
    original?.chipNumberMasked &&
    !normalizeChipNumber(values.chipNumber)
  ) {
    set('chipNumber', 'CHIP_NUMBER_CANNOT_REMOVE');
  }

  return errors;
}

function enteredAge(values: PetFormValues) {
  return {
    years: values.ageYears.trim() === '' ? 0 : Number(values.ageYears),
    months: values.ageMonths.trim() === '' ? 0 : Number(values.ageMonths),
  };
}

function resolveBirth(
  values: PetFormValues,
  today: string,
): { birthDate?: string; isBirthDateEstimated: boolean } {
  if (values.birthMode === 'exact') {
    return { birthDate: values.birthDate, isBirthDateEstimated: false };
  }
  if (values.birthMode === 'estimated') {
    return {
      birthDate: birthDateFromAge(enteredAge(values), today),
      isBirthDateEstimated: true,
    };
  }
  return { isBirthDateEstimated: false };
}

export function toCreateRequest(
  values: PetFormValues,
  ownerUserId: string,
  today: string,
): CreatePetRequest {
  const birth = resolveBirth(values, today);
  const chipNumber = normalizeChipNumber(values.chipNumber);
  return {
    name: normalizeWhitespace(values.name),
    species: values.species,
    breed: values.breed,
    sex: Number(values.sex) as PetSex,
    ...(birth.birthDate
      ? {
          birthDate: birth.birthDate,
          isBirthDateEstimated: birth.isBirthDateEstimated,
        }
      : {}),
    isNeutered: values.isNeutered,
    ...(chipNumber ? { chipNumber } : {}),
    ownerUserId,
  };
}

export function toUpdateRequest(
  values: PetFormValues,
  original: Pet,
  today: string,
): UpdatePetRequest {
  const request: UpdatePetRequest = {};

  const name = normalizeWhitespace(values.name);
  if (name !== original.name) request.name = name;
  if (values.breed !== original.breed) request.breed = values.breed;
  if (values.isNeutered !== original.isNeutered) {
    request.isNeutered = values.isNeutered;
  }

  if (values.birthMode === 'exact') {
    if (values.birthDate !== original.birthDate) {
      request.birthDate = values.birthDate;
    }
    if (original.isBirthDateEstimated) request.isBirthDateEstimated = false;
  } else if (values.birthMode === 'estimated') {
    const age = enteredAge(values);
    const originalAge =
      original.isBirthDateEstimated && original.birthDate
        ? ageFromBirthDate(original.birthDate, today)
        : null;
    const unchanged =
      originalAge !== null &&
      originalAge.years === age.years &&
      originalAge.months === age.months;
    if (!unchanged) request.birthDate = birthDateFromAge(age, today);
    if (!original.isBirthDateEstimated) request.isBirthDateEstimated = true;
  }

  const chipNumber = normalizeChipNumber(values.chipNumber);
  if (chipNumber && chipNumber !== original.chipNumber) {
    request.chipNumber = chipNumber;
  }

  return request;
}
