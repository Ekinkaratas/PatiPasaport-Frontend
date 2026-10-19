import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/api/client';
import {
  __resetSessionForTests,
  endSession,
  getAccessToken,
  getSessionState,
  initSession,
  startSession,
} from './session';
import { AUTH_EVENT_KEY } from './tokenStorage';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function tokens(n: number, expiresIn = 900) {
  return {
    data: {
      accessToken: `AT${n}`,
      tokenType: 'Bearer',
      expiresIn,
      refreshExpiresIn: 43200,
      userId: 'user-1',
    },
    message: 'SUCCESS',
    success: true,
  };
}

function errorBody(message: string) {
  return { data: null, message, success: false, correlationId: 'cid' };
}

let fetchMock: ReturnType<typeof vi.fn>;

function useFetch(handler: Handler) {
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init ?? {})),
  );
  vi.stubGlobal('fetch', fetchMock);
}

function callsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url) === `/api${path}`);
}

function bodyOf(call: unknown[]): Record<string, unknown> {
  return JSON.parse((call[1] as RequestInit).body as string);
}

function authHeader(call: unknown[]): string | undefined {
  return ((call[1] as RequestInit).headers as Record<string, string>)
    .Authorization;
}

function emitAuthEvent(type: string) {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: AUTH_EVENT_KEY,
      newValue: JSON.stringify({ type, at: Date.now() }),
    }),
  );
}

beforeEach(() => {
  __resetSessionForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('token yenileme', () => {
  it('eşzamanlı isteklerde tek bir refresh yapılır; gövdede token gönderilmez', async () => {
    useFetch((url) => {
      if (url === '/api/auth/refresh') return json(200, tokens(1));
      return json(200, {
        data: { ok: true },
        message: 'SUCCESS',
        success: true,
      });
    });

    const results = await Promise.all([
      apiRequest('/users/me'),
      apiRequest('/pets'),
      apiRequest('/consents'),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    const refreshCalls = callsTo('/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
    expect(bodyOf(refreshCalls[0]!)).toEqual({});
    expect(authHeader(refreshCalls[0]!)).toBeUndefined();
    expect(authHeader(callsTo('/pets')[0]!)).toBe('Bearer AT1');
    expect(getSessionState()).toMatchObject({
      status: 'authenticated',
      userId: 'user-1',
    });
  });

  it('401 alan istek token yenilenip bir kez tekrarlanır', async () => {
    startSession(tokens(1).data);
    let petsCalls = 0;
    useFetch((url, init) => {
      if (url === '/api/auth/refresh') return json(200, tokens(2));
      petsCalls += 1;
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer AT2'
        ? json(200, { data: { pets: [] }, message: 'SUCCESS', success: true })
        : json(401, errorBody('INVALID_TOKEN'));
    });

    await expect(apiRequest('/pets')).resolves.toEqual({ pets: [] });
    expect(petsCalls).toBe(2);
    expect(callsTo('/auth/refresh')).toHaveLength(1);
    expect(getAccessToken()).toBe('AT2');
  });

  it('oturum sırasında refresh 401 dönerse oturum nedeniyle birlikte kapanır', async () => {
    startSession(tokens(1, 1).data);
    useFetch((url) =>
      url === '/api/auth/refresh'
        ? json(401, errorBody('INVALID_TOKEN'))
        : json(200, { data: {}, message: 'SUCCESS', success: true }),
    );

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      status: 401,
    });
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'INVALID_TOKEN',
    });
    expect(callsTo('/users/me')).toHaveLength(0);
  });

  it('refresh ağ hatası verirse oturum kapatılmaz', async () => {
    startSession(tokens(1, 1).data);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(getSessionState().status).toBe('authenticated');
  });

  it('refresh sekmeler arası kilit içinde yapılır', async () => {
    const order: string[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: async (name: string, fn: () => Promise<unknown>) => {
          order.push(`lock:${name}`);
          return fn();
        },
      },
    });
    useFetch((url) => {
      order.push(url);
      return url === '/api/auth/refresh'
        ? json(200, tokens(3))
        : json(200, { data: {}, message: 'SUCCESS', success: true });
    });

    await apiRequest('/users/me');
    expect(order).toEqual([
      'lock:pp.auth.refresh',
      '/api/auth/refresh',
      '/api/users/me',
    ]);
  });

  it('anonim oturumda refresh denenmez', async () => {
    useFetch(() => json(401, errorBody('UNAUTH')));
    await initSession();
    fetchMock.mockClear();

    await expect(apiRequest('/users/me')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTH',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('oturum yaşam döngüsü', () => {
  it('giriş yanıtındaki clinicId oturuma yazılır; boş değer null olur', () => {
    startSession({ ...tokens(1).data, clinicId: 'clinic-1' });
    expect(getSessionState().clinicId).toBe('clinic-1');
    startSession({ ...tokens(2).data, clinicId: '' });
    expect(getSessionState().clinicId).toBeNull();
  });

  it('açılışta çerezle refresh denenir; geçerliyse oturum açılır', async () => {
    useFetch(() => json(200, tokens(1)));
    await initSession();
    expect(callsTo('/auth/refresh')).toHaveLength(1);
    expect(getSessionState()).toMatchObject({
      status: 'authenticated',
      userId: 'user-1',
    });
    expect(getAccessToken()).toBe('AT1');
  });

  it('açılışta refresh 401 dönerse anonim; oturum sonu bildirilmez', async () => {
    useFetch(() => json(401, errorBody('UNAUTH')));
    await initSession();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: null,
    });
  });

  it('eski localStorage refresh token kaydı açılışta silinir', async () => {
    localStorage.setItem('pp.refreshToken', 'eski');
    useFetch(() => json(401, errorBody('UNAUTH')));
    await initSession();
    expect(localStorage.getItem('pp.refreshToken')).toBeNull();
  });

  it('sunucuya ulaşılamazsa açılışta "unreachable"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    await initSession();
    expect(getSessionState().status).toBe('unreachable');
  });

  it('çıkış logout ucunu çağırır ve yerel oturumu temizler', async () => {
    startSession(tokens(1).data);
    useFetch(() =>
      json(200, { data: { success: true }, message: 'SUCCESS', success: true }),
    );

    await endSession();

    const call = callsTo('/auth/logout')[0]!;
    expect(bodyOf(call)).toEqual({});
    expect(authHeader(call)).toBe('Bearer AT1');
    expect(getAccessToken()).toBeNull();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'LOGOUT',
    });
  });

  it('çıkış sırasında uçuştaki refresh oturumu geri açmaz; yeni token iptal edilir', async () => {
    startSession(tokens(1, 1).data);
    let releaseRefresh: () => void = () => {};
    useFetch((url) => {
      if (url === '/api/auth/refresh') {
        return new Promise<Response>((resolve) => {
          releaseRefresh = () => resolve(json(200, tokens(2)));
        });
      }
      return json(200, { data: {}, message: 'SUCCESS', success: true });
    });

    const request = apiRequest('/users/me').catch((error: unknown) => error);
    await vi.waitFor(() => expect(callsTo('/auth/refresh')).toHaveLength(1));

    const logout = endSession();
    expect(getSessionState().status).toBe('anonymous');
    expect(callsTo('/auth/logout')).toHaveLength(0);

    releaseRefresh();
    await logout;
    await expect(request).resolves.toMatchObject({ code: 'UNAUTH' });

    expect(getAccessToken()).toBeNull();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'LOGOUT',
    });
    expect(authHeader(callsTo('/auth/logout')[0]!)).toBe('Bearer AT2');
    expect(callsTo('/users/me')).toHaveLength(0);
  });

  it('logout refresh kilidi altında gönderilir', async () => {
    startSession(tokens(1).data);
    const order: string[] = [];
    vi.stubGlobal('navigator', {
      ...navigator,
      locks: {
        request: async (name: string, fn: () => Promise<unknown>) => {
          order.push(`lock:${name}`);
          return fn();
        },
      },
    });
    useFetch((url) => {
      order.push(url);
      return json(200, { data: {}, message: 'SUCCESS', success: true });
    });

    await endSession();
    expect(order).toEqual(['lock:pp.auth.refresh', '/api/auth/logout']);
  });

  it('logout isteği başarısız olsa da yerel oturum kapanır', async () => {
    startSession(tokens(1).data);
    useFetch(() => json(401, errorBody('UNAUTH')));
    await endSession();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'LOGOUT',
    });
  });
});

describe('sekmeler arası eşitleme', () => {
  it('başka sekmede çıkış yapılınca bu sekme de kapanır', () => {
    startSession(tokens(1).data);
    emitAuthEvent('logout');
    expect(getAccessToken()).toBeNull();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'LOGOUT',
    });
  });

  it('başka sekmeden gelen çıkış, bu sekmede uçuştaki refresh ile geri açılmaz', async () => {
    startSession(tokens(1, 1).data);
    let releaseRefresh: () => void = () => {};
    useFetch((url) => {
      if (url === '/api/auth/refresh') {
        return new Promise<Response>((resolve) => {
          releaseRefresh = () => resolve(json(200, tokens(2)));
        });
      }
      return json(200, { data: {}, message: 'SUCCESS', success: true });
    });

    const request = apiRequest('/users/me').catch((error: unknown) => error);
    await vi.waitFor(() => expect(callsTo('/auth/refresh')).toHaveLength(1));
    emitAuthEvent('logout');
    releaseRefresh();
    await request;

    expect(getAccessToken()).toBeNull();
    expect(getSessionState()).toMatchObject({
      status: 'anonymous',
      endReason: 'LOGOUT',
    });
  });

  it('başka sekmede giriş yapılınca bu sekme çerezle oturum açar', async () => {
    useFetch(() => json(401, errorBody('UNAUTH')));
    await initSession();
    useFetch(() => json(200, tokens(5)));

    emitAuthEvent('login');

    await vi.waitFor(() =>
      expect(getSessionState().status).toBe('authenticated'),
    );
    expect(getAccessToken()).toBe('AT5');
  });

  it('oturum açıkken gelen giriş bildirimi yeni refresh başlatmaz', () => {
    startSession(tokens(1).data);
    useFetch(() => json(200, tokens(6)));
    emitAuthEvent('login');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
