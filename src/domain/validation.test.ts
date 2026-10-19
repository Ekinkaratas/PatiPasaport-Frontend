import { describe, expect, it } from 'vitest';
import {
  validateBirthDate,
  validateChipNumber,
  validateEmail,
  validateEstimatedAge,
  validatePetName,
  validateStockAmount,
  validateStockExpiry,
  validateStockName,
  validateFullName,
  validateLoginPassword,
  validateMobilePhone,
  validateNewPassword,
} from './validation';

describe('validateEmail', () => {
  it.each([
    ['', 'EMAIL_NOT_EMPTY'],
    ['   ', 'EMAIL_NOT_EMPTY'],
    ['ali', 'EMAIL_WRONG DATA FORMAT'],
    ['ali@x', 'EMAIL_WRONG DATA FORMAT'],
    [`${'a'.repeat(250)}@x.com`, 'EMAIL_MAX_LENGTH|254'],
    ['  Ali.Veli@Example.COM ', null],
    ['ayse+pati@mail.com.tr', null],
  ])('%s -> %s', (input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });
});

describe('validateNewPassword', () => {
  it.each([
    ['', 'PASSWORD_NOT_EMPTY'],
    ['Ab1!', 'PASSWORD_MIN_LENGTH|8'],
    [`Ab1!${'x'.repeat(69)}`, 'PASSWORD_MAX_LENGTH|72'],
    ['abcdefgh', 'PASSWORD_WEAK PASSWORD'],
    ['Abcdefg1', 'PASSWORD_WEAK PASSWORD'],
    ['abcdef1!', 'PASSWORD_WEAK PASSWORD'],
    ['Abcdef1!', null],
    // Backend deseni gibi büyük harf olarak yalnızca A–Z sayılır:
    ['Şifrem12.', 'PASSWORD_WEAK PASSWORD'],
    ['ŞifreM12.', null],
  ])('%s -> %s', (input, expected) => {
    expect(validateNewPassword(input)).toBe(expected);
  });
});

describe('validateLoginPassword', () => {
  it('yalnızca boşluk ve uzunluk denetler', () => {
    expect(validateLoginPassword('')).toBe('PASSWORD_NOT_EMPTY');
    expect(validateLoginPassword('x')).toBeNull();
    expect(validateLoginPassword('x'.repeat(73))).toBe(
      'PASSWORD_MAX_LENGTH|72',
    );
  });
});

describe('validateFullName', () => {
  it.each([
    ['', 'NAME_NOT_EMPTY'],
    ['Ali', 'NAME_MIN_LENGTH|5'],
    ['Mehmet', 'NAME_WRONG DATA FORMAT'],
    ['Ali Veli2', 'NAME_WRONG DATA FORMAT'],
    ['-Ali Veli', 'NAME_WRONG DATA FORMAT'],
    [`${'a'.repeat(40)} ${'b'.repeat(30)}`, 'NAME_MAX_LENGTH|64'],
    ['  Ayşe   Yılmaz ', null],
    ["Ali O'Neil", null],
    ['Zeynep Nur Kaya-Demir', null],
  ])('%s -> %s', (input, expected) => {
    expect(validateFullName(input)).toBe(expected);
  });
});

describe('validateMobilePhone', () => {
  it.each([
    ['', 'PHONE_NOT_EMPTY'],
    ['0212 123 45 67', 'PHONE_WRONG DATA FORMAT'],
    ['555123456', 'PHONE_WRONG DATA FORMAT'],
    ['0555 123 45 67', null],
    ['+905551234567', null],
    ['5551234567', null],
  ])('%s -> %s', (input, expected) => {
    expect(validateMobilePhone(input)).toBe(expected);
  });
});

describe('validatePetName', () => {
  it.each([
    ['', 'PET_NAME_NOT_EMPTY'],
    ['Pamuk', null],
    ['  Minnoş   Kız ', null],
    ['Rex2', 'PET_NAME_WRONG DATA FORMAT'],
    ["O'Malley", 'PET_NAME_WRONG DATA FORMAT'],
    ['a'.repeat(33), 'PET_NAME_MAX_LENGTH|32'],
  ])('%s -> %s', (input, expected) => {
    expect(validatePetName(input)).toBe(expected);
  });
});

describe('validateChipNumber', () => {
  it.each([
    ['', null],
    ['792 0000 0000 1234', null],
    ['12345', 'CHIP_NUMBER_WRONG DATA FORMAT'],
    ['79200000000123A', 'CHIP_NUMBER_WRONG DATA FORMAT'],
  ])('%s -> %s', (input, expected) => {
    expect(validateChipNumber(input)).toBe(expected);
  });
});

describe('validateBirthDate', () => {
  it.each([
    ['', 'BIRTH_DATE_NOT_EMPTY'],
    ['2026-13-40', 'BIRTH_DATE_MUST_BE_DATE'],
    ['2026-10-13', 'BIRTH_DATE_CANNOT_BE_FUTURE'],
    ['2026-10-12', null],
    ['2020-02-29', null],
  ])('%s -> %s', (input, expected) => {
    expect(validateBirthDate(input, '2026-10-12')).toBe(expected);
  });
});

describe('validateEstimatedAge', () => {
  it.each([
    ['', '', 'ESTIMATED_AGE_REQUIRED'],
    ['0', '0', 'ESTIMATED_AGE_REQUIRED'],
    ['3', '', null],
    ['', '5', null],
    ['2', '12', 'ESTIMATED_AGE_INVALID'],
    ['-1', '0', 'ESTIMATED_AGE_INVALID'],
    ['1.5', '0', 'ESTIMATED_AGE_INVALID'],
    ['61', '0', 'ESTIMATED_AGE_INVALID'],
  ])('%s yıl %s ay -> %s', (years, months, expected) => {
    expect(validateEstimatedAge(years, months)).toBe(expected);
  });
});

describe('stok doğrulamaları', () => {
  it.each([
    ['', 'STOCK_NAME_NOT_EMPTY'],
    ['Kuduz aşısı 1 ml', null],
    ['Amoksisilin %50 (250 mg)', null],
    ['Aşı<script>', 'STOCK_NAME_WRONG DATA FORMAT'],
    ['a'.repeat(65), 'STOCK_NAME_MAX_LENGTH|64'],
  ])('ad %s -> %s', (input, expected) => {
    expect(validateStockName(input)).toBe(expected);
  });

  it.each([
    ['', 'QUANTITY_NOT_EMPTY'],
    ['0', null],
    ['100000', null],
    ['100001', 'QUANTITY_MAX|100000'],
    ['-1', 'QUANTITY_MUST_BE_NUMBER'],
    ['1.5', 'QUANTITY_MUST_BE_NUMBER'],
  ])('miktar %s -> %s', (input, expected) => {
    expect(validateStockAmount('QUANTITY', input)).toBe(expected);
  });

  it('son kullanma tarihi isteğe bağlı ama geçmiş olamaz', () => {
    expect(validateStockExpiry('', '2026-10-16')).toBeNull();
    expect(validateStockExpiry('2026-10-15', '2026-10-16')).toBe(
      'EXPIRES_AT_CANNOT_BE_PAST',
    );
    expect(validateStockExpiry('2026-10-16', '2026-10-16')).toBeNull();
  });
});
