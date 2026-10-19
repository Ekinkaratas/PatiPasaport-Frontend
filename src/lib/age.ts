export interface AgeParts {
  years: number;
  months: number;
}

function parseDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function ageFromBirthDate(
  birthDate: string,
  today: string,
): AgeParts | null {
  const birth = parseDate(birthDate);
  const now = parseDate(today);
  if (!birth || !now) return null;
  const [by, bm, bd] = birth;
  const [ty, tm, td] = now;
  const totalMonths = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (totalMonths < 0) return null;
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}

export function birthDateFromAge(
  { years, months }: AgeParts,
  today: string,
): string {
  const now = parseDate(today);
  if (!now) throw new Error(`Invalid date: ${today}`);
  const [ty, tm, td] = now;
  const totalMonths = ty * 12 + (tm - 1) - (years * 12 + months);
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  const day = Math.min(td, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(day)}`;
}
