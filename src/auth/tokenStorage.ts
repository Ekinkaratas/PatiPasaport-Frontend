const LEGACY_REFRESH_TOKEN_KEY = 'pp.refreshToken';
export const AUTH_EVENT_KEY = 'pp.auth.event';

export type AuthEvent = 'login' | 'logout';

export function clearLegacyRefreshToken(): void {
  try {
    localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    return;
  }
}

export function announceAuthEvent(type: AuthEvent): void {
  try {
    localStorage.setItem(
      AUTH_EVENT_KEY,
      JSON.stringify({ type, at: Date.now() }),
    );
  } catch {
    return;
  }
}

export function parseAuthEvent(raw: string | null): AuthEvent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { type?: unknown };
    return value.type === 'login' || value.type === 'logout'
      ? value.type
      : null;
  } catch {
    return null;
  }
}
