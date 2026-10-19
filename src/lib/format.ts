import { BUSINESS_TIME_ZONE } from '@/domain/constants';

const LOCALE_TAGS: Record<string, string> = { tr: 'tr-TR', en: 'en-GB' };

function localeTag(language: string): string {
  return LOCALE_TAGS[language] ?? 'en-GB';
}

/** Bugünün tarihi Türkiye saatine göre `YYYY-AA-GG` (backend ile aynı hesap). */
export function todayInBusinessTimeZone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `YYYY-AA-GG` ya da ISO zaman damgasını seçili dilde gösterir.
 * Boş string (backend'in "değer yok"u) için boş döner.
 */
export function formatDate(
  value: string,
  language: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  if (!value) return '';
  const dateOnly = DATE_ONLY.exec(value);
  // Saat bilgisi olmayan tarih UTC gece yarısı olarak yorumlanır ve
  // saat dilimine göre bir gün kayabilir; bu yüzden UTC'de biçimlenir.
  const date = dateOnly
    ? new Date(
        Date.UTC(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
        ),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(language), {
    ...options,
    timeZone: dateOnly ? 'UTC' : BUSINESS_TIME_ZONE,
  }).format(date);
}

export function monthInBusinessTimeZone(now: Date = new Date()): string {
  return todayInBusinessTimeZone(now).slice(0, 7);
}

export function formatMonth(month: string, language: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  return new Intl.DateTimeFormat(localeTag(language), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

export function formatMoney(kurus: number, language: string): string {
  return new Intl.NumberFormat(localeTag(language), {
    style: 'currency',
    currency: 'TRY',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kurus / 100);
}

export function formatDateTime(value: string, language: string): string {
  return formatDate(value, language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** `+905551234567` -> TR: `0555 123 45 67`, EN: `+90 555 123 45 67` */
export function formatPhone(e164: string, language: string): string {
  const match = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (!match) return e164;
  const [, a, b, c, d] = match;
  return language === 'tr' ? `0${a} ${b} ${c} ${d}` : `+90 ${a} ${b} ${c} ${d}`;
}

/** Backend'in `normalizeTrMobilePhone`'u ile aynı: cep telefonu -> E.164. */
export function normalizeTrMobilePhone(input: string): string {
  const compact = input.replace(/\s+/g, '');
  const match = /^(?:\+90|0)?(5\d{9})$/.exec(compact);
  return match ? `+90${match[1]}` : compact;
}

/** Backend'in `normalizeTrPhone`'u ile aynı: sabit hat/0850/cep -> E.164. */
export function normalizeTrPhone(input: string): string {
  const compact = input.replace(/\s+/g, '');
  const match = /^(?:\+90|0)?([2-58]\d{9})$/.exec(compact);
  return match ? `+90${match[1]}` : compact;
}
