import * as authApi from '@/api/endpoints/auth';
import { ApiError, isApiError } from '@/api/errors';
import type { TokenResponse } from '@/api/types';
import {
  announceAuthEvent,
  AUTH_EVENT_KEY,
  clearLegacyRefreshToken,
  parseAuthEvent,
} from './tokenStorage';

/**
 * Oturum durumu (React dışı, `useSyncExternalStore` ile okunur).
 *
 * - Erişim token'ı (opaque, ~15 dk) yalnızca bellekte.
 * - Yenileme hem sekme içinde (tek uçuş) hem sekmeler arasında
 *   (Web Locks) tekilleştirilir: backend refresh token rotation'da aynı
 *   token'ın iki kez kullanılmasını hırsızlık sayıp oturum ailesini kapatır.
 */

export type SessionStatus =
  /** Uygulama açılışında refresh token doğrulanıyor. */
  | 'initializing'
  | 'authenticated'
  | 'anonymous'
  /** Refresh token var ama sunucuya ulaşılamadığı için doğrulanamadı. */
  | 'unreachable';

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  clinicId: string | null;
  /** Oturum sunucu tarafından sonlandırıldıysa nedeni (ör. `ACCOUNT_DISABLED`). */
  endReason: string | null;
}

interface AccessToken {
  token: string;
  /** epoch ms */
  expiresAt: number;
}

export const LOGOUT_REASON = 'LOGOUT';

const LOCK_NAME = 'pp.auth.refresh';
/** Süresi bu kadar içinde dolacak token'ı kullanmadan önce yenile. */
const EXPIRY_SKEW_MS = 30_000;

let state: SessionState = {
  status: 'initializing',
  userId: null,
  clinicId: null,
  endReason: null,
};
let accessToken: AccessToken | null = null;
let inflightRefresh: Promise<string | null> | null = null;
/**
 * Oturum nesli: çıkış ve girişte artar. Başladığı nesil geçmişte kalan bir
 * refresh sonucu uygulanmaz; aksi halde çıkış sırasında uçuşta olan bir
 * refresh, kullanıcının oturumunu sessizce geri açardı.
 */
let epoch = 0;
/** Nesli geçtiği için uygulanmayan refresh'in verdiği token; çıkışta iptal edilir. */
let supersededToken: string | null = null;
const listeners = new Set<() => void>();

function setState(next: Partial<SessionState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSessionState(): SessionState {
  return state;
}

export function getAccessToken(): string | null {
  return accessToken?.token ?? null;
}

function applyTokens(tokens: TokenResponse): string {
  accessToken = {
    token: tokens.accessToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
  };
  setState({
    status: 'authenticated',
    userId: tokens.userId,
    clinicId: tokens.clinicId || null,
    endReason: null,
  });
  return tokens.accessToken;
}

function clearLocal(endReason: string | null = null): void {
  epoch += 1;
  accessToken = null;
  setState({ status: 'anonymous', userId: null, clinicId: null, endReason });
}

/** Refresh isteğinin hatası oturumu kalıcı olarak bitiriyor mu? */
function isTerminalRefreshError(error: unknown): error is ApiError {
  return (
    isApiError(error) &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, fn);
  }
  return fn();
}

/**
 * Refresh token ile yeni erişim token'ı alır.
 * - Oturum sunucuca bittiyse `null` döner ve yerel oturumu temizler.
 * - Ağ/sunucu hatasında `ApiError` fırlatır, oturuma dokunmaz.
 */
export function refreshSession({
  reportEnd = true,
}: { reportEnd?: boolean } = {}): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = withRefreshLock(async () => {
    const startedEpoch = epoch;
    try {
      const tokens = await authApi.refresh();
      if (epoch !== startedEpoch) {
        supersededToken = tokens.accessToken;
        return getAccessToken();
      }
      return applyTokens(tokens);
    } catch (error) {
      if (epoch !== startedEpoch) return getAccessToken();
      if (isTerminalRefreshError(error)) {
        clearLocal(reportEnd ? error.code : null);
        return null;
      }
      throw error;
    }
  }).finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

/** Geçerli bir erişim token'ı döner; gerekiyorsa önce yeniler. */
export async function ensureAccessToken(): Promise<string | null> {
  if (accessToken && accessToken.expiresAt - Date.now() > EXPIRY_SKEW_MS) {
    return accessToken.token;
  }
  if (state.status === 'anonymous') return null;
  return refreshSession();
}

/**
 * `rejectedToken` ile yapılan istek 401 aldı. Arada başka bir istek token'ı
 * zaten yenilediyse onu kullan, yoksa yenile.
 */
export async function recoverFromUnauthorized(
  rejectedToken: string,
): Promise<string | null> {
  if (
    accessToken &&
    accessToken.token !== rejectedToken &&
    accessToken.expiresAt - Date.now() > EXPIRY_SKEW_MS
  ) {
    return accessToken.token;
  }
  return refreshSession();
}

/** Uygulama açılışında bir kez çağrılır. */
export async function initSession(): Promise<void> {
  clearLegacyRefreshToken();
  setState({ status: 'initializing' });
  try {
    await refreshSession({ reportEnd: false });
  } catch {
    setState({ status: 'unreachable' });
  }
}

/** Giriş / kayıt başarılı olduğunda. */
export function startSession(tokens: TokenResponse): void {
  epoch += 1;
  applyTokens(tokens);
  announceAuthEvent('login');
}

/**
 * Çıkış: yerel oturumu hemen temizler, sonra sunucudaki oturum ailesini ve
 * erişim token'ını iptal etmeyi dener. Logout refresh kilidi altında ve
 * uçuştaki refresh bittikten sonra gider; böylece rotasyonla gelen en yeni
 * çerez ve token iptal edilir.
 */
export async function endSession(): Promise<void> {
  const token = getAccessToken();
  const pending = inflightRefresh;
  clearLocal(LOGOUT_REASON);
  announceAuthEvent('logout');
  try {
    await withRefreshLock(async () => {
      await pending?.catch(() => null);
      const latest = supersededToken ?? token;
      supersededToken = null;
      await authApi.logout(latest ?? undefined);
    });
  } catch {
    return;
  }
}

function onStorage(event: StorageEvent): void {
  if (event.key !== AUTH_EVENT_KEY) return;
  const type = parseAuthEvent(event.newValue);

  if (type === 'logout' && state.status !== 'anonymous') {
    clearLocal(LOGOUT_REASON);
    return;
  }

  if (
    type === 'login' &&
    (state.status === 'anonymous' || state.status === 'unreachable')
  ) {
    refreshSession({ reportEnd: false }).catch(() =>
      setState({ status: 'unreachable' }),
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', onStorage);
}

/** Yalnızca testler için: modül durumunu sıfırlar. */
export function __resetSessionForTests(): void {
  state = {
    status: 'initializing',
    userId: null,
    clinicId: null,
    endReason: null,
  };
  accessToken = null;
  inflightRefresh = null;
  epoch = 0;
  supersededToken = null;
  listeners.clear();
}
