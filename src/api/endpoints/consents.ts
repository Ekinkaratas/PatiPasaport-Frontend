import { api } from '../client';
import type {
  Consent,
  GrantConsentRequest,
  ListMyConsentsResponse,
} from '../types';

export function listMyConsents(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<ListMyConsentsResponse> {
  return api.get<ListMyConsentsResponse>('/consents', {
    query: { page, pageSize },
    signal,
  });
}

export function getConsentStatus(
  clinicId: string,
  petId: string,
  signal?: AbortSignal,
): Promise<Consent> {
  return api.get<Consent>('/consents/status', {
    query: { clinicId, petId },
    signal,
  });
}

export function grantConsent(request: GrantConsentRequest): Promise<Consent> {
  return api.post<Consent>('/consents', request);
}

export function revokeConsent(consentId: string): Promise<Consent> {
  return api.post<Consent>(`/consents/${encodeURIComponent(consentId)}/revoke`);
}
