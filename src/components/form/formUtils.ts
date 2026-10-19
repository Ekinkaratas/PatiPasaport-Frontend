import { isApiError } from '@/api/errors';

/**
 * Backend hatasını forma dağıtır: doğrulama hatası ya da "zaten kayıtlı"
 * gibi alana özgü bir kod ilgili alanın altına, gerisi genel hata kutusuna.
 *
 * @param fieldMap backend alan kodu (DtoPrefix) -> form alanı
 * @param codeMap  backend yanıt kodu -> form alanı
 */
export function splitServerError<F extends string>(
  error: unknown,
  fieldMap: Partial<Record<string, F>>,
  codeMap: Partial<Record<string, F>> = {},
): { field: F; code: string } | null {
  if (!isApiError(error)) return null;
  const byField = error.field ? fieldMap[error.field] : undefined;
  if (byField) return { field: byField, code: error.code };
  const byCode = codeMap[error.code];
  if (byCode) return { field: byCode, code: error.code };
  return null;
}

/** Gönderimde ilk hatalı alana odaklanır (hata mesajları çizildikten sonra). */
export function focusFirstInvalid(form: HTMLFormElement): void {
  requestAnimationFrame(() => {
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
