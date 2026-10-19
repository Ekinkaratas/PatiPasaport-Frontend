export const CONSENT_DURATIONS = [
  'today',
  'week',
  'month',
  'threeMonths',
  'sixMonths',
  'year',
  'custom',
] as const;

export type ConsentDuration = (typeof CONSENT_DURATIONS)[number];

const BUSINESS_UTC_OFFSET = '+03:00';

function parse(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

function format(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parse(date);
  return format(y, m, d + days);
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = parse(date);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return format(year, month, Math.min(d, daysInMonth(year, month)));
}

export function maxConsentDate(today: string): string {
  return addDays(addMonths(today, 12), -1);
}

export function durationEndDate(
  duration: Exclude<ConsentDuration, 'custom'>,
  today: string,
): string {
  switch (duration) {
    case 'today':
      return today;
    case 'week':
      return addDays(today, 7);
    case 'month':
      return addMonths(today, 1);
    case 'threeMonths':
      return addMonths(today, 3);
    case 'sixMonths':
      return addMonths(today, 6);
    case 'year':
      return maxConsentDate(today);
  }
}

export function toExpiresAt(endDate: string): string {
  return `${endDate}T23:59:59${BUSINESS_UTC_OFFSET}`;
}

export function validateConsentEndDate(
  endDate: string,
  today: string,
): string | null {
  if (!endDate) return 'EXPIRES_AT_NOT_EMPTY';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return 'EXPIRES_AT_MUST_BE_DATE';
  if (endDate < today) return 'EXPIRES_AT_CANNOT_BE_PAST';
  if (endDate > maxConsentDate(today)) return 'CONSENT_TOO_LONG';
  return null;
}
