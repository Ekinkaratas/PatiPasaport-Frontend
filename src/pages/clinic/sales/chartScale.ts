const LOCALE_TAGS: Record<string, string> = { tr: 'tr-TR', en: 'en-GB' };

export function chartTicks(max: number, intervals = 4): number[] {
  if (max <= 0) return [0, 10_000];
  const rough = max / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((factor) => factor * magnitude)
      .find((value) => value >= rough) ?? 10 * magnitude;
  const count = Math.ceil(max / step);
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

export function compactMoney(kurus: number, language: string): string {
  return new Intl.NumberFormat(LOCALE_TAGS[language] ?? 'en-GB', {
    style: 'currency',
    currency: 'TRY',
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(kurus / 100);
}
