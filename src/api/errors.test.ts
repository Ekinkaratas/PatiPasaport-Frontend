import { describe, expect, it } from 'vitest';
import { ApiError, parseBackendMessage } from './errors';

describe('parseBackendMessage', () => {
  it.each([
    ['PASSWORD_MIN_LENGTH|8', 'PASSWORD', 'MIN_LENGTH', ['8']],
    ['EMAIL_WRONG DATA FORMAT', 'EMAIL', 'WRONG_DATA_FORMAT', []],
    ['PASSWORD_WEAK PASSWORD', 'PASSWORD', 'WEAK_PASSWORD', []],
    ['PET_NAME_MAX_LENGTH|32', 'PET_NAME', 'MAX_LENGTH', ['32']],
    ['PAGE_MIN|1', 'PAGE', 'MIN', ['1']],
    ['PAGE_SIZE_NOT_VALID', 'PAGE_SIZE', 'NOT_VALID', []],
    [
      'ONLY_BELOW_CRITICAL_MUST_BE_BOOLEAN',
      'ONLY_BELOW_CRITICAL',
      'MUST_BE_BOOLEAN',
      [],
    ],
    ['QUANTITY_MAX|100000', 'QUANTITY', 'MAX', ['100000']],
    ['EXPIRES_AT_CANNOT_BE_PAST', 'EXPIRES_AT', 'CANNOT_BE_PAST', []],
    ['REMEMBER_ME_WRONG DATA TYPE', 'REMEMBER_ME', 'WRONG_DATA_TYPE', []],
    ['content.TITLE_MIN_LENGTH|2', 'TITLE', 'MIN_LENGTH', ['2']],
    [
      'content.vaccination.VACCINE_NAME_NOT_EMPTY',
      'VACCINE_NAME',
      'NOT_EMPTY',
      [],
    ],
    [
      'content.labResult.items.1.TEST_NAME_NOT_EMPTY',
      'TEST_NAME',
      'NOT_EMPTY',
      [],
    ],
  ])('%s -> doğrulama mesajı', (message, field, rule, args) => {
    expect(parseBackendMessage(message)).toEqual({
      kind: 'validation',
      field,
      rule,
      args,
    });
  });

  it.each([
    'EMAIL_ALREADY_EXISTS',
    'PASSWORD_OR_EMAIL_WRONG',
    'BAD_REQUEST',
    'UNAUTH',
    'NETWORK_ERROR',
  ])('%s -> yanıt kodu', (message) => {
    expect(parseBackendMessage(message)).toEqual({
      kind: 'code',
      code: message,
    });
  });
});

describe('ApiError', () => {
  it('doğrulama hatasında alanı verir', () => {
    const error = new ApiError({
      status: 400,
      code: 'PHONE_WRONG DATA FORMAT',
    });
    expect(error.field).toBe('PHONE');
    expect(error.isUnauthorized).toBe(false);
  });

  it('ağ hatasını status 0 ile işaretler', () => {
    const error = new ApiError({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.isNetworkError).toBe(true);
    expect(error.field).toBeUndefined();
  });
});
