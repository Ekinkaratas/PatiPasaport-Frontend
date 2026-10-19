export const SUPPORTED_LANGUAGES = ['tr', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = 'pp.language';

export function isLanguage(value: unknown): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language);
}

/**
 * Açılış dili:
 * 1. Kullanıcı daha önce dil seçtiyse o.
 * 2. Tarayıcının birincil dili Türkçe ise Türkçe.
 * 3. Diğer tüm durumlarda İngilizce.
 */
export function detectInitialLanguage(
  storedValue: string | null,
  browserLanguages: readonly string[],
): Language {
  if (isLanguage(storedValue)) return storedValue;
  const primary = browserLanguages[0]?.toLowerCase() ?? '';
  return primary === 'tr' || primary.startsWith('tr-') ? 'tr' : 'en';
}

export function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Depolama kapalıysa seçim yalnızca bu oturum için geçerli olur.
  }
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages?.length) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}
