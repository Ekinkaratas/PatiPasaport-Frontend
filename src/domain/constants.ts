/**
 * Backend'in kabul ettiği kod listeleri. Arayüz bu kodların çevirisini
 * gösterir (`i18n/locales/* /enums.json`), backend'e kodun kendisi gider.
 */

export const PET_SPECIES = [
  'DOG',
  'CAT',
  'BIRD',
  'RABBIT',
  'HAMSTER',
  'GUINEA_PIG',
  'FERRET',
  'TURTLE',
] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const PET_BREEDS = {
  DOG: [
    'GOLDEN_RETRIEVER',
    'LABRADOR_RETRIEVER',
    'GERMAN_SHEPHERD',
    'KANGAL',
    'SIBERIAN_HUSKY',
    'POODLE',
    'POMERANIAN',
    'YORKSHIRE_TERRIER',
    'MIXED',
  ],
  CAT: [
    'BRITISH_SHORTHAIR',
    'SCOTTISH_FOLD',
    'PERSIAN',
    'TURKISH_VAN',
    'TURKISH_ANGORA',
    'SIAMESE',
    'MAINE_COON',
    'RAGDOLL',
    'MIXED',
  ],
  BIRD: [
    'BUDGERIGAR',
    'CANARY',
    'COCKATIEL',
    'LOVEBIRD',
    'AFRICAN_GREY',
    'MIXED',
  ],
  RABBIT: [
    'HOLLAND_LOP',
    'NETHERLAND_DWARF',
    'LIONHEAD',
    'ANGORA',
    'REX',
    'MIXED',
  ],
  HAMSTER: [
    'SYRIAN',
    'CAMPBELL_DWARF',
    'WINTER_WHITE_DWARF',
    'ROBOROVSKI',
    'MIXED',
  ],
  GUINEA_PIG: ['AMERICAN', 'ABYSSINIAN', 'PERUVIAN', 'TEDDY', 'MIXED'],
  FERRET: ['MIXED'],
  TURTLE: [
    'RED_EARED_SLIDER',
    'YELLOW_BELLIED_SLIDER',
    'RUSSIAN_TORTOISE',
    'MIXED',
  ],
} as const satisfies Record<PetSpecies, readonly string[]>;
export type PetBreed = (typeof PET_BREEDS)[PetSpecies][number];

export const PET_BREED_CODES: readonly PetBreed[] = [
  ...new Set(Object.values(PET_BREEDS).flat()),
];

export const STOCK_CATEGORIES = [
  'VACCINE',
  'MEDICINE',
  'SUPPLY',
  'FOOD',
  'OTHER',
] as const;
export type StockCategory = (typeof STOCK_CATEGORIES)[number];

export const STOCK_UNITS = [
  'PIECE',
  'BOX',
  'BOTTLE',
  'AMPOULE',
  'TABLET',
  'DOSE',
  'ML',
  'MG',
  'G',
] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

export const CONSENT_SCOPES = [
  'medical_read',
  'medical_write',
  'vaccination_read',
  'prescription_read',
  'chip_number_read',
  'owner_contact_read',
] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PAGE_SIZES = [8, 16, 32, 64, 128] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export const BUSINESS_TIME_ZONE = 'Europe/Istanbul';
