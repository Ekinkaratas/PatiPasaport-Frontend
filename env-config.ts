import type { Plugin } from 'vite';

export const SERVE_ENV = [
  'API_PROXY_TARGET',
  'VITE_API_BASE_URL',
  'VITE_CONTACT_EMAIL',
] as const;

export const BUILD_ENV = [
  'VITE_API_BASE_URL',
  'VITE_CONTACT_EMAIL',
  'SITE_URL',
] as const;

export const OPTIONAL_URL_ENV = [
  'VITE_SOURCE_FRONTEND_URL',
  'VITE_SOURCE_BACKEND_URL',
] as const;

export function checkOptionalUrls(
  env: Record<string, string | undefined>,
  names: readonly string[],
): void {
  const invalid = names.filter((name) => {
    const value = env[name]?.trim();
    return Boolean(value) && !/^https:\/\/\S+$/i.test(value!);
  });
  if (invalid.length > 0) {
    throw new Error(
      `.env içinde geçersiz adres: ${invalid.join(', ')} (https:// ile başlamalı, tırnak ve boşluk olmadan)`,
    );
  }
}

export function requireEnv(
  env: Record<string, string | undefined>,
  names: readonly string[],
): void {
  const missing = names.filter((name) => !env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `.env içinde eksik değişken: ${missing.join(', ')} (bkz. .env.example)`,
    );
  }
}

export function siteOrigin(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`SITE_URL http(s) ile başlamalı: ${raw}`);
  }
  return url.origin;
}

const SITEMAP_PAGES = [
  { path: '/', changefreq: 'monthly', priority: '1.0' },
  { path: '/register', changefreq: 'yearly', priority: '0.6' },
  { path: '/login', changefreq: 'yearly', priority: '0.5' },
] as const;

export function sitemapXml(origin: string, lastmod: string): string {
  const urls = SITEMAP_PAGES.map(
    (page) => `  <url>
    <loc>${origin}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

export function sitemapPlugin(siteUrl: string | undefined): Plugin {
  return {
    name: 'pp-sitemap',
    apply: 'build',
    generateBundle() {
      if (!siteUrl) return;
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: sitemapXml(
          siteOrigin(siteUrl),
          new Date().toISOString().slice(0, 10),
        ),
      });
    },
  };
}
