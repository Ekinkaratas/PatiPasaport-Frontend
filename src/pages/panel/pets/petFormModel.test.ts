import { describe, expect, it } from 'vitest';
import type { Pet } from '@/api/types';
import {
  emptyPetForm,
  petToFormValues,
  toCreateRequest,
  toUpdateRequest,
  validatePetForm,
  type PetFormValues,
} from './petFormModel';

const TODAY = '2026-10-12';

const pet: Pet = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Pamuk',
  species: 'CAT',
  breed: 'TURKISH_VAN',
  sex: 2,
  birthDate: '2023-10-12',
  isBirthDateEstimated: true,
  isNeutered: false,
  ownerUserId: 'owner',
  chipNumberMasked: '****4821',
  chipNumber: '792000000004821',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function form(overrides: Partial<PetFormValues>): PetFormValues {
  return { ...emptyPetForm(), ...overrides };
}

describe('validatePetForm', () => {
  it('oluştururken zorunlu alanları ister', () => {
    expect(validatePetForm(emptyPetForm(), TODAY, 'create')).toEqual({
      name: 'PET_NAME_NOT_EMPTY',
      species: 'SPECIES_NOT_EMPTY',
      sex: 'SEX_NOT_EMPTY',
      breed: 'BREED_NOT_EMPTY',
      birthDate: 'BIRTH_DATE_NOT_EMPTY',
    });
  });

  it('türe ait olmayan cinsi reddeder', () => {
    const errors = validatePetForm(
      form({
        name: 'Rex',
        species: 'DOG',
        breed: 'CANARY',
        sex: '1',
        birthMode: 'unknown',
      }),
      TODAY,
      'create',
    );
    expect(errors).toEqual({ breed: 'BREED_NOT_VALID' });
  });

  it('tahmini yaş seçiliyse yaş ister', () => {
    const errors = validatePetForm(
      form({
        name: 'Rex',
        species: 'DOG',
        breed: 'MIXED',
        sex: '1',
        birthMode: 'estimated',
      }),
      TODAY,
      'create',
    );
    expect(errors).toEqual({ age: 'ESTIMATED_AGE_REQUIRED' });
  });

  it('düzenlerken kayıtlı çip numarası ve doğum tarihi silinemez', () => {
    const values = {
      ...petToFormValues(pet, TODAY),
      chipNumber: '',
      birthMode: 'unknown' as const,
    };
    expect(validatePetForm(values, TODAY, 'edit', pet)).toEqual({
      chipNumber: 'CHIP_NUMBER_CANNOT_REMOVE',
      birthDate: 'BIRTH_DATE_CANNOT_REMOVE',
    });
  });
});

describe('toCreateRequest', () => {
  it('tahmini yaştan doğum tarihi üretir ve boş alanları göndermez', () => {
    expect(
      toCreateRequest(
        form({
          name: '  Minnoş  Kız ',
          species: 'CAT',
          breed: 'MIXED',
          sex: '2',
          birthMode: 'estimated',
          ageYears: '2',
          ageMonths: '3',
          isNeutered: true,
        }),
        'owner-1',
        TODAY,
      ),
    ).toEqual({
      name: 'Minnoş Kız',
      species: 'CAT',
      breed: 'MIXED',
      sex: 2,
      birthDate: '2024-07-12',
      isBirthDateEstimated: true,
      isNeutered: true,
      ownerUserId: 'owner-1',
    });
  });

  it('doğum tarihi bilinmiyorsa tarih göndermez, çip boşlukları silinir', () => {
    expect(
      toCreateRequest(
        form({
          name: 'Rex',
          species: 'DOG',
          breed: 'KANGAL',
          sex: '1',
          birthMode: 'unknown',
          chipNumber: '792 000 000 001 234',
        }),
        'owner-1',
        TODAY,
      ),
    ).toEqual({
      name: 'Rex',
      species: 'DOG',
      breed: 'KANGAL',
      sex: 1,
      isNeutered: false,
      chipNumber: '792000000001234',
      ownerUserId: 'owner-1',
    });
  });
});

describe('toUpdateRequest', () => {
  it('değişiklik yoksa boş istek', () => {
    expect(toUpdateRequest(petToFormValues(pet, TODAY), pet, TODAY)).toEqual(
      {},
    );
  });

  it('yalnızca değişen alanları gönderir', () => {
    const values = {
      ...petToFormValues(pet, TODAY),
      name: 'Pamuk Hanım',
      isNeutered: true,
    };
    expect(toUpdateRequest(values, pet, TODAY)).toEqual({
      name: 'Pamuk Hanım',
      isNeutered: true,
    });
  });

  it('tahminiden kesin tarihe geçişte işareti kaldırır', () => {
    const values = {
      ...petToFormValues(pet, TODAY),
      birthMode: 'exact' as const,
      birthDate: '2023-09-01',
    };
    expect(toUpdateRequest(values, pet, TODAY)).toEqual({
      birthDate: '2023-09-01',
      isBirthDateEstimated: false,
    });
  });

  it('tahmini yaş değişirse yeni tarih hesaplar', () => {
    const values = { ...petToFormValues(pet, TODAY), ageYears: '4' };
    expect(toUpdateRequest(values, pet, TODAY)).toEqual({
      birthDate: '2022-10-12',
    });
  });

  it('yeni çip numarası gönderilir', () => {
    const values = {
      ...petToFormValues(pet, TODAY),
      chipNumber: '792 000 000 009 999',
    };
    expect(toUpdateRequest(values, pet, TODAY)).toEqual({
      chipNumber: '792000000009999',
    });
  });
});
