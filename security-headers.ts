export function apiOrigin(apiBaseUrl: string | undefined): string | null {
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) return null;
  return new URL(apiBaseUrl).origin;
}

export function contentSecurityPolicy({
  apiBaseUrl,
  forHeader,
}: {
  apiBaseUrl?: string;
  forHeader: boolean;
}): string {
  const connect = ["'self'", apiOrigin(apiBaseUrl)].filter(Boolean).join(' ');
  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
  ];
  if (forHeader) directives.push("frame-ancestors 'none'");
  return directives.join('; ');
}

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
