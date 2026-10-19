import { api } from '../client';
import type { GetMeResponse, UpdateMeRequest, UserResponse } from '../types';

export function getMe(signal?: AbortSignal): Promise<GetMeResponse> {
  return api.get<GetMeResponse>('/users/me', { signal });
}

export function updateMe(request: UpdateMeRequest): Promise<UserResponse> {
  return api.patch<UserResponse>('/users/me', request);
}

export function deactivateMe(): Promise<UserResponse> {
  return api.post<UserResponse>('/users/me/deactivate');
}
