import { httpRequest } from '../http';
import type { BaseResponse, LogoutResponse, TokenResponse } from '../types';

/**
 * Auth uçları `@Public()`'tir: Bearer token istemez, bu yüzden doğrudan
 * `httpRequest` kullanılır. `clientType`'ı gateway `X-Client-Type`
 * başlığından kendisi ekler; gövdeye yazılmaz.
 */

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export async function login(request: LoginRequest): Promise<TokenResponse> {
  const res = await httpRequest<BaseResponse<TokenResponse>>('/auth/login', {
    method: 'POST',
    body: request,
  });
  return res.data;
}

export async function register(
  request: RegisterRequest,
): Promise<TokenResponse> {
  const res = await httpRequest<BaseResponse<TokenResponse>>('/auth/register', {
    method: 'POST',
    body: request,
  });
  return res.data;
}

export async function refresh(): Promise<TokenResponse> {
  const res = await httpRequest<BaseResponse<TokenResponse>>('/auth/refresh', {
    method: 'POST',
    body: {},
  });
  return res.data;
}

/** Erişim token'ı verilirse gateway onu da iptal eder. */
export async function logout(accessToken?: string): Promise<LogoutResponse> {
  const res = await httpRequest<BaseResponse<LogoutResponse>>('/auth/logout', {
    method: 'POST',
    body: {},
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  return res.data;
}
