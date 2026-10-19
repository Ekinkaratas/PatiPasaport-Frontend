/**
 * Gateway hata mesajları iki biçimde gelir:
 *
 * 1. Yanıt kodu: `EMAIL_ALREADY_EXISTS`, `UNAUTH`, `BAD_REQUEST` ...
 *    (backend `ResponseMessages` enum'u)
 * 2. Doğrulama mesajı: `<ALAN>_<KURAL>[|arg1|arg2]`
 *    ör. `PASSWORD_MIN_LENGTH|8`, `EMAIL_WRONG DATA FORMAT`
 *    (backend `getValidationMessage(DtoPrefix, ValidationType, ...args)`)
 *
 * Bu modül ikisini ayırır; çeviri `i18n/translateError.ts`'te yapılır.
 */

/** Backend `ValidationType` değerleri (bazıları boşluk içerir). */
const VALIDATION_TYPES = [
  'NOT_EMPTY',
  'MUST_BE_UNIQUE',
  'MUST_BE_STRING',
  'MUST_BE_NUMBER',
  'MUST_BE_ARRAY',
  'MUST_BE_DATE',
  'MUST_BE_BOOLEAN',
  'CANNOT_BE_FUTURE',
  'CANNOT_BE_PAST',
  'MAX',
  'MAX_LENGTH',
  'MIN',
  'MIN_LENGTH',
  'WRONG DATA FORMAT',
  'WRONG DATA TYPE',
  'NOT_VALID',
  'NOT_STRONG',
  'WEAK PASSWORD',
] as const;

/** Uzun olan önce denenir: `X_MAX_LENGTH`, `MAX` ile değil `MAX_LENGTH` ile eşleşmeli. */
const VALIDATION_TYPES_BY_LENGTH = [...VALIDATION_TYPES].sort(
  (a, b) => b.length - a.length,
);

/** Sadece istemcide üretilen hata kodları (backend'e hiç ulaşılamadığında). */
export const ClientErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

export type ParsedBackendMessage =
  | { kind: 'code'; code: string }
  | {
      kind: 'validation';
      /** Alan kodu, ör. `PASSWORD`, `PET_NAME`. */
      field: string;
      /** Kural kodu, boşluklar `_` ile: `WRONG_DATA_FORMAT`, `MIN_LENGTH`. */
      rule: string;
      args: string[];
    };

export function parseBackendMessage(message: string): ParsedBackendMessage {
  const [head = '', ...args] = message.split('|');
  const path = head.lastIndexOf('.');
  const code = path === -1 ? head : head.slice(path + 1);
  for (const type of VALIDATION_TYPES_BY_LENGTH) {
    const suffix = `_${type}`;
    if (code.length > suffix.length && code.endsWith(suffix)) {
      return {
        kind: 'validation',
        field: code.slice(0, -suffix.length).trim(),
        rule: type.replace(/ /g, '_'),
        args,
      };
    }
  }
  return { kind: 'code', code: head };
}

export interface ApiErrorInit {
  /** HTTP durum kodu; ağ/zaman aşımı hatalarında 0. */
  status: number;
  /** Ham hata mesajı (backend kodu ya da `ClientErrorCode`). */
  code: string;
  correlationId?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly correlationId?: string;
  readonly parsed: ParsedBackendMessage;

  constructor({ status, code, correlationId, cause }: ApiErrorInit) {
    super(code, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.parsed = parseBackendMessage(code);
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Doğrulama hatasıysa ilgili form alanının backend kodu. */
  get field(): string | undefined {
    return this.parsed.kind === 'validation' ? this.parsed.field : undefined;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
