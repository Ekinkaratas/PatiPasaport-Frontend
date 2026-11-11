import { describe, expect, it } from 'vitest';
import {
  HealthAssessmentStatus,
  type HealthAssessmentResponse,
} from '@/api/types';
import {
  ASSESSMENT_RETRY_AFTER_MS,
  ASSESSMENT_STALE_PENDING_MS,
  requestAvailableAt,
} from './assessmentModel';

const REQUESTED_AT = '2026-11-11T20:00:00.000Z';
const REQUESTED_MS = Date.parse(REQUESTED_AT);

function response(
  patch: Partial<HealthAssessmentResponse>,
): HealthAssessmentResponse {
  return {
    status: HealthAssessmentStatus.READY,
    assessment: null,
    confidence: 0,
    requestedAt: REQUESTED_AT,
    generatedAt: '',
    isStale: false,
    ...patch,
  };
}

describe('requestAvailableAt', () => {
  it('backend süreleriyle aynıdır', () => {
    expect(ASSESSMENT_RETRY_AFTER_MS).toBe(10 * 60 * 1000);
    expect(ASSESSMENT_STALE_PENDING_MS).toBe(30 * 60 * 1000);
  });

  it('değerlendirme yoksa hemen istenebilir', () => {
    expect(requestAvailableAt(undefined)).toBe(0);
  });

  it('güncel hazır sonuçta düğme gösterilmez', () => {
    expect(requestAvailableAt(response({}))).toBeNull();
  });

  it('eskimiş ya da başarısız sonuçta son istekten 10 dk sonra', () => {
    const expected = REQUESTED_MS + ASSESSMENT_RETRY_AFTER_MS;
    expect(requestAvailableAt(response({ isStale: true }))).toBe(expected);
    expect(
      requestAvailableAt(
        response({ status: HealthAssessmentStatus.FAILED, isStale: false }),
      ),
    ).toBe(expected);
  });

  it('bekleyen istekte son istekten 30 dk sonra', () => {
    expect(
      requestAvailableAt(response({ status: HealthAssessmentStatus.PENDING })),
    ).toBe(REQUESTED_MS + ASSESSMENT_STALE_PENDING_MS);
  });

  it('istek zamanı okunamazsa beklemez', () => {
    expect(
      requestAvailableAt(
        response({ status: HealthAssessmentStatus.FAILED, requestedAt: '' }),
      ),
    ).toBe(ASSESSMENT_RETRY_AFTER_MS);
  });
});
