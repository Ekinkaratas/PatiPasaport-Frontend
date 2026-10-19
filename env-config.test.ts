import { describe, expect, it } from 'vitest';
import {
  BUILD_ENV,
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
