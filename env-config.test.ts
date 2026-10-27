import { describe, expect, it } from 'vitest';
import {
  BUILD_ENV,
  checkOptionalUrls,
  OPTIONAL_URL_ENV,
  SERVE_ENV,
  requireEnv,
  siteOrigin,
  sitemapXml,
} from './env-config';

describe('requireEnv', () => {
  it('eksik ya da boş değişkenleri adlarıyla bildirir', () => {
    expect(() =>
      requireEnv({ VITE_API_BASE_URL: '/api', SITE_URL: '  ' }, BUILD_ENV),
    ).toThrow('.env içinde eksik değişken: VITE_CONTACT_EMAIL, SITE_URL');
  });

  it('hepsi tanımlıysa sessiz kalır', () => {
    expect(() =>
      requireEnv(
        {
          API_PROXY_TARGET: 'http://localhost:3000',
          VITE_API_BASE_URL: '/api',
          VITE_CONTACT_EMAIL: 'iletisim@example.test',
        },
        SERVE_ENV,
      ),
    ).not.toThrow();
  });
});

describe('checkOptionalUrls', () => {
  it('boş adrese izin verir, https olmayan ya da tırnaklı adresi reddeder', () => {
    expect(() =>
      checkOptionalUrls(
        { VITE_SOURCE_FRONTEND_URL: '', VITE_SOURCE_BACKEND_URL: undefined },
        OPTIONAL_URL_ENV,
      ),
    ).not.toThrow();
    expect(() =>
      checkOptionalUrls(
        {
          VITE_SOURCE_FRONTEND_URL: 'https://github.com/ornek/web',
          VITE_SOURCE_BACKEND_URL: '"https://github.com/ornek/api"',
        },
        OPTIONAL_URL_ENV,
      ),
    ).toThrow('geçersiz adres: VITE_SOURCE_BACKEND_URL');
  });
});

describe('sitemap', () => {
  it('site adresinin yalnızca kökünü kullanır', () => {
    expect(siteOrigin('https://ornek.test/')).toBe('https://ornek.test');
    expect(siteOrigin(' https://ornek.test/yol ')).toBe('https://ornek.test');
    expect(() => siteOrigin('ftp://ornek.test')).toThrow('SITE_URL');
  });

  it('herkese açık sayfaları verilen adresle listeler', () => {
    const xml = sitemapXml('https://ornek.test', '2026-10-19');
    expect(xml.match(/<loc>[^<]+<\/loc>/g)).toEqual([
      '<loc>https://ornek.test/</loc>',
      '<loc>https://ornek.test/register</loc>',
      '<loc>https://ornek.test/login</loc>',
    ]);
    expect(xml).toContain('<lastmod>2026-10-19</lastmod>');
    expect(xml).not.toContain('/panel');
  });
});
