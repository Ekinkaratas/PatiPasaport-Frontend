import {
  API_BASE_URL,
  CLIENT_TYPE_HEADER,
  CLIENT_TYPE_WEB,
  CORRELATION_ID_HEADER,
  REQUEST_TIMEOUT_MS,
} from './config';
import { randomUuid } from '@/lib/uuid';
import { ApiError, ClientErrorCode } from './errors';
import type { ErrorResponseBody } from './types';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
  responseType?: 'json' | 'blob';
}

export function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    // Boş değerler hiç gönderilmez; backend DTO'ları bunları "yok" sayar.
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isErrorBody(value: unknown): value is ErrorResponseBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

/** Gateway gövdesi olmayan (proxy/altyapı kaynaklı) hatalar için yedek kod. */
function fallbackCode(status: number): string {
  if (status >= 500) return 'SERVICE_UNAVAILABLE';
  if (status === 401) return 'UNAUTH';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'TOO_MANY_REQUESTS';
  return 'BAD_REQUEST';
}

/**
 * Gateway'e tek bir HTTP isteği atar. Kimlik doğrulama ve token yenileme
 * burada yapılmaz (bkz. `client.ts`); bu katman yalnızca:
 * - `X-Client-Type: 1` ve `x-correlation-id` başlıklarını ekler,
 * - zaman aşımını uygular,
 * - hataları `ApiError`'a çevirir.
 */
function transportError(
  error: unknown,
  signal: AbortSignal | undefined,
  timeoutSignal: AbortSignal,
): unknown {
  if (signal?.aborted) return error;
  return new ApiError({
    status: 0,
    code: timeoutSignal.aborted
      ? ClientErrorCode.TIMEOUT
      : ClientErrorCode.NETWORK_ERROR,
    cause: error,
  });
}

export async function httpRequest<T>(
  path: string,
  {
    method = 'GET',
    body,
    query,
    headers,
    signal,
    timeoutMs = REQUEST_TIMEOUT_MS,
    responseType = 'json',
  }: HttpRequestOptions = {},
): Promise<T> {
  const requestHeaders: Record<string, string> = {
    Accept: responseType === 'blob' ? '*/*' : 'application/json',
    [CLIENT_TYPE_HEADER]: CLIENT_TYPE_WEB,
    [CORRELATION_ID_HEADER]: randomUuid(),
    ...headers,
  };
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body:
        body === undefined
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body),
      signal: combinedSignal,
      credentials: 'same-origin',
    });
  } catch (error) {
    // Çağıran iptal ettiyse (ör. sayfadan çıkıldı) hatayı olduğu gibi bırak.
    throw transportError(error, signal, timeoutSignal);
  }

  if (responseType === 'blob' && response.ok) {
    try {
      return (await response.blob()) as T;
    } catch (error) {
      throw transportError(error, signal, timeoutSignal);
    }
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw transportError(error, signal, timeoutSignal);
  }
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  const correlationId =
    (isErrorBody(payload) ? payload.correlationId : undefined) ??
    response.headers.get(CORRELATION_ID_HEADER) ??
    undefined;

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: isErrorBody(payload)
        ? payload.message
        : fallbackCode(response.status),
      correlationId,
    });
  }

  if (payload === undefined && text) {
    throw new ApiError({
      status: response.status,
      code: ClientErrorCode.INVALID_RESPONSE,
      correlationId,
    });
  }

  return payload as T;
}
