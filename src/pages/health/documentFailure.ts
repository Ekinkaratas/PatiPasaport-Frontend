import type { TFunction } from 'i18next';

export const DOCUMENT_FAILURE_CODES = [
  'FILE_NOT_FOUND',
  'FILE_INTEGRITY_ERROR',
  'UNSUPPORTED_MIME_TYPE',
  'UNREADABLE_DOCUMENT',
  'TOO_MANY_PAGES',
  'NOT_A_MEDICAL_DOCUMENT',
  'INVALID_AI_OUTPUT',
  'AI_PROVIDER_REJECTED',
  'AI_PROVIDER_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export type DocumentFailureCode = (typeof DOCUMENT_FAILURE_CODES)[number];

export function isDocumentFailureCode(
  code: string,
): code is DocumentFailureCode {
  return (DOCUMENT_FAILURE_CODES as readonly string[]).includes(code);
}

export function documentFailureMessage(
  code: string,
  t: TFunction<'health'>,
): string {
  return isDocumentFailureCode(code)
    ? t(`documents.failureCodes.${code}`)
    : t('documents.failure', { code });
}
