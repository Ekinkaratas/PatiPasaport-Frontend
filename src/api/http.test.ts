import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUrl, httpRequest } from './http';
import { ApiError } from './errors';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('buildUrl', () => {
  it('/api önekini ve boş olmayan sorgu parametrelerini ekler', () => {
    expect(
      buildUrl('/pets/search', {
        page: 1,
        name: '',
        species: undefined,
        pageSize: 8,
      }),
    ).toBe('/api/pets/search?page=1&pageSize=8');
  });
});

describe('httpRequest', () => {
  it('X-Client-Type: 1 ve correlation id başlıklarını gönderir', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);

    await httpRequest('/health');

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Client-Type']).toBe('1');
    expect(headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('gateway hata gövdesini ApiError yapar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(409, {
          data: null,
          message: 'EMAIL_ALREADY_EXISTS',
          success: false,
          correlationId: 'abc',
        }),
      ),
    );

    await expect(
      httpRequest('/auth/register', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      correlationId: 'abc',
    });
  });

  it('gövdesiz 5xx (proxy: backend kapalı) -> SERVICE_UNAVAILABLE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 500 })),
    );
    await expect(httpRequest('/health')).rejects.toMatchObject({
      status: 500,
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('fetch reddederse NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    const error = await httpRequest('/health').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('httpRequest ikili yanıt', () => {
  it('blob istenirse gövdeyi blob olarak döner', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const blob = await httpRequest<Blob>('/documents/x/file', {
      responseType: 'blob',
    });

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(4);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>).Accept).toBe('*/*');
  });

  it('blob isteğinde hata gövdesini yine ApiError olarak çözer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(503, {
          data: null,
          message: 'SERVICE_UNAVAILABLE',
          success: false,
        }),
      ),
    );

    await expect(
      httpRequest('/documents/x/file', { responseType: 'blob' }),
    ).rejects.toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
  });

  it('gövde okunurken bağlantı koparsa NETWORK_ERROR', async () => {
    const truncated = new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new TypeError('terminated'));
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/pdf' } },
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(truncated));

    await expect(
      httpRequest('/documents/x/file', { responseType: 'blob' }),
    ).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});
