import { normalizeTrMobilePhone } from '@/lib/format';
import { parseMoney } from '@/lib/money';

/**
 * İstemci tarafı doğrulama — backend DTO kurallarının aynısı.
 * Hata, backend'in ürettiği biçimde bir KOD olarak döner
 * (`PASSWORD_MIN_LENGTH|8`) ve `translateError` ile çevrilir; böylece istemci
 * ve sunucu hataları kullanıcıya aynı cümleyle gösterilir.
 */

export type ValidationCode = string;

export const ACCOUNT_EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const FULL_NAME_MIN_LENGTH = 5;
export const FULL_NAME_MAX_LENGTH = 64;

export const FULL_NAME_PATTERN =
  /^[a-zA-ZçğıöşüâîûÇĞİÖŞÜÂÎÛ]+(?:[ '-][a-zA-ZçğıöşüâîûÇĞİÖŞÜÂÎÛ]+)+$/;
export const TR_MOBILE_E164_PATTERN = /^\+905\d{9}$/;

/** Şifre kuralları — form ekranındaki kontrol listesi de bunu kullanır. */
export const PASSWORD_RULES = [
  {
    id: 'length',
    test: (v: string) =>
      v.length >= PASSWORD_MIN_LENGTH && v.length <= PASSWORD_MAX_LENGTH,
  },
  { id: 'lower', test: (v: string) => /[a-z]/.test(v) },
  { id: 'upper', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'digit', test: (v: string) => /\d/.test(v) },
  { id: 'special', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]['id'];

/**
 * class-validator `IsEmail`'ın yaklaşık karşılığı: yerel kısım, @, en az bir
 * nokta içeren alan adı ve en az 2 harfli uzantı. Sınırdaki durumları
 * backend son sözü söyleyerek yakalar.
 */
const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function validateEmail(raw: string): ValidationCode | null {
  const value = normalizeEmail(raw);
  if (!value) return 'EMAIL_NOT_EMPTY';
  if (value.length > ACCOUNT_EMAIL_MAX_LENGTH) {
    return `EMAIL_MAX_LENGTH|${ACCOUNT_EMAIL_MAX_LENGTH}`;
  }
  if (!EMAIL_PATTERN.test(value)) return 'EMAIL_WRONG DATA FORMAT';
  return null;
}

/** Kayıt: güçlü şifre kuralları. */
export function validateNewPassword(value: string): ValidationCode | null {
  if (!value) return 'PASSWORD_NOT_EMPTY';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `PASSWORD_MIN_LENGTH|${PASSWORD_MIN_LENGTH}`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `PASSWORD_MAX_LENGTH|${PASSWORD_MAX_LENGTH}`;
  }
  if (!PASSWORD_RULES.every((rule) => rule.test(value))) {
    return 'PASSWORD_WEAK PASSWORD';
  }
  return null;
}

/** Giriş: yalnızca boşluk ve uzunluk (eski şifreler de girebilsin). */
export function validateLoginPassword(value: string): ValidationCode | null {
  if (!value) return 'PASSWORD_NOT_EMPTY';
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `PASSWORD_MAX_LENGTH|${PASSWORD_MAX_LENGTH}`;
  }
  return null;
}

export function validateFullName(raw: string): ValidationCode | null {
  const value = normalizeWhitespace(raw);
  if (!value) return 'NAME_NOT_EMPTY';
  if (value.length < FULL_NAME_MIN_LENGTH) {
    return `NAME_MIN_LENGTH|${FULL_NAME_MIN_LENGTH}`;
  }
  if (value.length > FULL_NAME_MAX_LENGTH) {
    return `NAME_MAX_LENGTH|${FULL_NAME_MAX_LENGTH}`;
  }
  if (!FULL_NAME_PATTERN.test(value)) return 'NAME_WRONG DATA FORMAT';
  return null;
}

export function validateMobilePhone(raw: string): ValidationCode | null {
  if (!raw.trim()) return 'PHONE_NOT_EMPTY';
  if (!TR_MOBILE_E164_PATTERN.test(normalizeTrMobilePhone(raw))) {
    return 'PHONE_WRONG DATA FORMAT';
  }
  return null;
}

export const PET_NAME_MAX_LENGTH = 32;
export const PET_TEXT_PATTERN =
  /^[a-zA-ZçğıöşüâîûÇĞİÖŞÜÂÎÛ]+(?: [a-zA-ZçğıöşüâîûÇĞİÖŞÜÂÎÛ]+)*$/;
export const CHIP_NUMBER_PATTERN = /^\d{15}$/;
export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const ESTIMATED_AGE_MAX_YEARS = 60;

export function normalizeChipNumber(value: string): string {
  return value.replace(/\s+/g, '');
}

export function validatePetName(raw: string): ValidationCode | null {
  const value = normalizeWhitespace(raw);
  if (!value) return 'PET_NAME_NOT_EMPTY';
  if (value.length > PET_NAME_MAX_LENGTH) {
    return `PET_NAME_MAX_LENGTH|${PET_NAME_MAX_LENGTH}`;
  }
  if (!PET_TEXT_PATTERN.test(value)) return 'PET_NAME_WRONG DATA FORMAT';
  return null;
}

export function validateChipNumber(raw: string): ValidationCode | null {
  const value = normalizeChipNumber(raw);
  if (!value) return null;
  if (!CHIP_NUMBER_PATTERN.test(value)) return 'CHIP_NUMBER_WRONG DATA FORMAT';
  return null;
}

export function validateBirthDate(
  value: string,
  today: string,
): ValidationCode | null {
  if (!value) return 'BIRTH_DATE_NOT_EMPTY';
  if (!DATE_ONLY_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    return 'BIRTH_DATE_MUST_BE_DATE';
  }
  if (value > today) return 'BIRTH_DATE_CANNOT_BE_FUTURE';
  return null;
}

export function validateEstimatedAge(
  years: string,
  months: string,
): ValidationCode | null {
  const y = years.trim() === '' ? 0 : Number(years);
  const m = months.trim() === '' ? 0 : Number(months);
  if (!Number.isInteger(y) || !Number.isInteger(m) || y < 0 || m < 0) {
    return 'ESTIMATED_AGE_INVALID';
  }
  if (y > ESTIMATED_AGE_MAX_YEARS || m > 11) return 'ESTIMATED_AGE_INVALID';
  if (y === 0 && m === 0) return 'ESTIMATED_AGE_REQUIRED';
  return null;
}

export const STOCK_NAME_PATTERN =
  /^[a-zA-Z0-9çğıöşüâîûÇĞİÖŞÜÂÎÛ.,%()+/-]+(?: [a-zA-Z0-9çğıöşüâîûÇĞİÖŞÜÂÎÛ.,%()+/-]+)*$/;
export const STOCK_NAME_MAX_LENGTH = 64;
export const STOCK_AMOUNT_MAX = 100_000;

export function validateStockName(raw: string): ValidationCode | null {
  const value = normalizeWhitespace(raw);
  if (!value) return 'STOCK_NAME_NOT_EMPTY';
  if (value.length > STOCK_NAME_MAX_LENGTH) {
    return `STOCK_NAME_MAX_LENGTH|${STOCK_NAME_MAX_LENGTH}`;
  }
  if (!STOCK_NAME_PATTERN.test(value)) return 'STOCK_NAME_WRONG DATA FORMAT';
  return null;
}

export function validateStockAmount(
  prefix: 'QUANTITY' | 'CRITICAL_LEVEL',
  raw: string,
): ValidationCode | null {
  const value = raw.trim();
  if (!value) return `${prefix}_NOT_EMPTY`;
  if (!/^\d+$/.test(value)) return `${prefix}_MUST_BE_NUMBER`;
  if (Number(value) > STOCK_AMOUNT_MAX)
    return `${prefix}_MAX|${STOCK_AMOUNT_MAX}`;
  return null;
}

export const STOCK_PRICE_MAX = 1_000_000_000;

export type StockPricePrefix = 'PURCHASE_PRICE' | 'SALE_PRICE' | 'UNIT_PRICE';

export function validateStockPrice(
  prefix: StockPricePrefix,
  raw: string,
  required = true,
): ValidationCode | null {
  const value = raw.trim();
  if (!value) return required ? `${prefix}_NOT_EMPTY` : null;
  const kurus = parseMoney(value);
  if (kurus === null) return `${prefix}_WRONG DATA FORMAT`;
  if (kurus > STOCK_PRICE_MAX) return `${prefix}_MAX|${STOCK_PRICE_MAX}`;
  return null;
}

export function validateStockExpiry(
  value: string,
  today: string,
): ValidationCode | null {
  if (!value) return null;
  if (!DATE_ONLY_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    return 'EXPIRES_AT_MUST_BE_DATE';
  }
  if (value < today) return 'EXPIRES_AT_CANNOT_BE_PAST';
  return null;
}
