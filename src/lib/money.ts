const MONEY_PATTERN = /^\d{1,8}(?:[.,]\d{1,2})?$/;

export function parseMoney(raw: string): number | null {
  const value = raw.trim();
  if (!MONEY_PATTERN.test(value)) return null;
  const [whole = '0', fraction = ''] = value.replace(',', '.').split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function toMoneyInput(kurus: number | undefined, language: string) {
  if (kurus === undefined) return '';
  const whole = Math.floor(kurus / 100);
  const fraction = String(kurus % 100).padStart(2, '0');
  return `${whole}${language === 'tr' ? ',' : '.'}${fraction}`;
}
