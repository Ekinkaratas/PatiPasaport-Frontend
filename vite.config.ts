/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { contentSecurityPolicy, SECURITY_HEADERS } from './security-headers';
import {
  BUILD_ENV,
  checkOptionalUrls,
  OPTIONAL_URL_ENV,
  requireEnv,
  SERVE_ENV,
  sitemapPlugin,
} from './env-config';

// Gateway CORS açmadığı için tarayıcı API'ye aynı origin'den gider:
// geliştirmede Vite `/api/*` isteklerini gateway'e aktarır ve `/api` önekini siler
// (gateway'de global prefix yok: `/api/auth/login` -> `/auth/login`).
// Production'da aynı işi reverse proxy (nginx vb.) yapar.

function cspMetaPlugin(csp: string): Plugin {
  return {
    name: 'pp-csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: csp },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.VITEST) {
    requireEnv(env, command === 'build' ? BUILD_ENV : SERVE_ENV);
    checkOptionalUrls(env, OPTIONAL_URL_ENV);
  }
  const apiTarget = env.API_PROXY_TARGET;
  const apiBaseUrl = env.VITE_API_BASE_URL;

  const apiProxy = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };

  return {
    plugins: [
      react(),
      tailwindcss(),
      cspMetaPlugin(contentSecurityPolicy({ apiBaseUrl, forHeader: false })),
      sitemapPlugin(env.SITE_URL),
    ],
    resolve: {
      // tsconfig.app.json'daki `@/*` -> `src/*` eşlemesini kullanır.
      tsconfigPaths: true,
    },
    build: {
      sourcemap: false,
    },
    server: {
      port: 5173,
      headers: SECURITY_HEADERS,
      proxy: apiProxy,
    },
    preview: {
      port: 4173,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Security-Policy': contentSecurityPolicy({
          apiBaseUrl,
          forHeader: true,
        }),
      },
      proxy: apiProxy,
    },
    test: {
      environment: 'jsdom',
      env: {
        VITE_API_BASE_URL: '/api',
        VITE_CONTACT_EMAIL: 'iletisim@example.test',
        VITE_SOURCE_FRONTEND_URL: 'https://github.com/ornek/patipasaport-web',
        VITE_SOURCE_BACKEND_URL: 'https://github.com/ornek/patipasaport',
      },
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
