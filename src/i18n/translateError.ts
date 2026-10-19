import type { i18n as I18n } from 'i18next';
import { isApiError, parseBackendMessage } from '@/api/errors';

type LooseT = (key: string, options?: Record<string, unknown>) => string;

/**
 * Herhangi bir hatayı kullanıcıya gösterilecek, seçili dilde bir cümleye çevirir.
 * - Backend yanıt kodu -> `errors:codes.<KOD>`
 * - Doğrulama mesajı  -> önce alana özel `errors:specific.<ALAN>_<KURAL>`,
 *                        yoksa `errors:validation.<KURAL>` + `errors:fields.<ALAN>`
 * - Bilinmeyen        -> `errors:unknown`
 */
export function translateError(error: unknown, i18n: I18n): string {
  const t = i18n.t.bind(i18n) as unknown as LooseT;
  const exists = (key: string) => i18n.exists(key);

  const message = isApiError(error)
    ? error.code
    : typeof error === 'string'
      ? error
      : null;
  if (!message) return t('errors:unknown');

  const parsed = parseBackendMessage(message);

  if (parsed.kind === 'validation') {
    const argument = parsed.args[0];
    const argumentKey = `errors:specific.${parsed.field}_${parsed.rule}_${argument}`;
    if (argument !== undefined && exists(argumentKey)) return t(argumentKey);
    const specificKey = `errors:specific.${parsed.field}_${parsed.rule}`;
    if (exists(specificKey)) return t(specificKey);
    const ruleKey = `errors:validation.${parsed.rule}`;
    if (!exists(ruleKey)) return t('errors:unknown');
    const fieldKey = `errors:fields.${parsed.field}`;
    const field = exists(fieldKey) ? t(fieldKey) : t('errors:fields._default');
    return t(ruleKey, { field, arg: parsed.args[0] ?? '' });
  }

  const codeKey = `errors:codes.${parsed.code}`;
  return exists(codeKey) ? t(codeKey) : t('errors:unknown');
}
