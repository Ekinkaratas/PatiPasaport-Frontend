import { afterAll, describe, expect, it } from 'vitest';
import i18n, { NAMESPACES, resources } from './index';
import { detectInitialLanguage } from './language';
import { translateError } from './translateError';
import { ApiError } from '@/api/errors';
import {
  CONSENT_SCOPES,
  PET_BREED_CODES,
  PET_SPECIES,
  STOCK_CATEGORIES,
  STOCK_UNITS,
} from '@/domain/constants';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('detectInitialLanguage', () => {
  it('kayıtlı seçim her şeyden önce gelir', () => {
    expect(detectInitialLanguage('en', ['tr-TR'])).toBe('en');
    expect(detectInitialLanguage('tr', ['en-US'])).toBe('tr');
  });

  it('tarayıcının birincil dili Türkçe ise Türkçe', () => {
    expect(detectInitialLanguage(null, ['tr-TR', 'en-US'])).toBe('tr');
    expect(detectInitialLanguage(null, ['tr'])).toBe('tr');
  });

  it('diğer tüm durumlarda İngilizce', () => {
    expect(detectInitialLanguage(null, ['en-US', 'tr-TR'])).toBe('en');
    expect(detectInitialLanguage(null, ['de-DE'])).toBe('en');
    expect(detectInitialLanguage(null, [])).toBe('en');
    expect(detectInitialLanguage('fr', ['de'])).toBe('en');
  });
});

describe('çeviri dosyaları', () => {
  it.each(NAMESPACES)('%s: TR ve EN aynı anahtarlara sahip', (ns) => {
    expect(keyPaths(resources.en[ns]).sort()).toEqual(
      keyPaths(resources.tr[ns]).sort(),
    );
  });

  it('backend kod listelerinin hepsinin çevirisi var', () => {
    for (const lang of ['tr', 'en'] as const) {
      const enums = resources[lang].enums as Record<
        string,
        Record<string, unknown>
      >;
      for (const code of PET_SPECIES)
        expect(enums.species?.[code]).toBeTruthy();
      for (const code of PET_BREED_CODES)
        expect(enums.breed?.[code]).toBeTruthy();
      for (const code of STOCK_CATEGORIES)
        expect(enums.stockCategory?.[code]).toBeTruthy();
      for (const code of STOCK_UNITS)
        expect(enums.stockUnit?.[code]).toBeTruthy();
      for (const code of CONSENT_SCOPES)
        expect(enums.consentScope?.[code]).toBeTruthy();
    }
  });
});

describe('translateError', () => {
  afterAll(() => i18n.changeLanguage('tr'));

  it('doğrulama mesajını alan adı ve parametreyle Türkçeye çevirir', async () => {
    await i18n.changeLanguage('tr');
    const error = new ApiError({ status: 400, code: 'PASSWORD_MIN_LENGTH|8' });
    expect(translateError(error, i18n)).toBe(
      'Şifre en az 8 karakter olmalıdır.',
    );
  });

  it('yanıt kodunu İngilizceye çevirir', async () => {
    await i18n.changeLanguage('en');
    const error = new ApiError({ status: 409, code: 'EMAIL_ALREADY_EXISTS' });
    expect(translateError(error, i18n)).toBe(
      'An account with this email address already exists.',
    );
  });

  it('alana özel mesaj varsa onu kullanır', async () => {
    await i18n.changeLanguage('tr');
    const error = new ApiError({
      status: 400,
      code: 'PHONE_WRONG DATA FORMAT',
    });
    expect(translateError(error, i18n)).toBe(
      'Geçerli bir cep telefonu numarası girin (05XX XXX XX XX).',
    );
  });

  it('bilinmeyen alan için genel ifade kullanır', async () => {
    await i18n.changeLanguage('tr');
    const error = new ApiError({ status: 400, code: 'SOMETHING_NOT_EMPTY' });
    expect(translateError(error, i18n)).toBe('Bu alan boş bırakılamaz.');
  });

  it('parametreye özel mesajı genel alan mesajından önce kullanır', async () => {
    await i18n.changeLanguage('tr');
    expect(
      translateError(
        new ApiError({ status: 400, code: 'QUANTITY_MIN|0' }),
        i18n,
      ),
    ).toBe("Stok yetersiz: miktar 0'ın altına düşemez.");
    expect(
      translateError(
        new ApiError({ status: 400, code: 'QUANTITY_MIN|1' }),
        i18n,
      ),
    ).toBe('Miktar en az 1 olmalıdır.');
  });

  it('bilinmeyen kod ve hata türünde genel mesaja düşer', async () => {
    await i18n.changeLanguage('tr');
    expect(
      translateError(new ApiError({ status: 500, code: 'WHATEVER' }), i18n),
    ).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    expect(translateError(new Error('x'), i18n)).toBe(
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    );
  });
});
