/**
 * Sitede gösterilen sabit bilgiler.
 */
export const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL;

function httpsUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value || !/^https:\/\//i.test(value)) return null;
  return value;
}

export function sourceLinks(): {
  frontend: string | null;
  backend: string | null;
} {
  return {
    frontend: httpsUrl(import.meta.env.VITE_SOURCE_FRONTEND_URL),
    backend: httpsUrl(import.meta.env.VITE_SOURCE_BACKEND_URL),
  };
}
