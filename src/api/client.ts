import { ensureAccessToken, recoverFromUnauthorized } from '@/auth/session';
import { ApiError } from './errors';
import { httpRequest, type HttpRequestOptions } from './http';
import type { BaseResponse } from './types';

/**
 * Kimlik doğrulamalı gateway çağrısı.
 * - `Authorization: Bearer <opaque>` ekler, süresi dolmak üzereyse önce yeniler.
 * - 401 alırsa token'ı bir kez yenileyip isteği tekrarlar.
 * - `BaseResponse` zarfını açıp yalnızca `data`'yı döner.
 */
export function apiRequest<T>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  return withAuth((token) => send<T>(path, options, token));
}

export function apiBlob(
  path: string,
  options: Omit<HttpRequestOptions, 'method' | 'body' | 'responseType'> = {},
): Promise<Blob> {
  return withAuth((token) =>
    httpRequest<Blob>(path, {
      ...options,
      responseType: 'blob',
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    }),
  );
}

async function withAuth<T>(call: (token: string) => Promise<T>): Promise<T> {
  const token = await ensureAccessToken();
  if (!token) throw new ApiError({ status: 401, code: 'UNAUTH' });

  try {
    return await call(token);
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isUnauthorized) throw error;

    const retryToken = await recoverFromUnauthorized(token);
    if (!retryToken) throw error;
    return call(retryToken);
  }
}

async function send<T>(
  path: string,
  options: HttpRequestOptions,
  token: string,
): Promise<T> {
  const res = await httpRequest<BaseResponse<T>>(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export const api = {
  get: <T>(
    path: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(
    path: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) => apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
