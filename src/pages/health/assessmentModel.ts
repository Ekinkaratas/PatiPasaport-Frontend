import {
  HealthAssessmentStatus,
  type HealthAssessmentResponse,
} from '@/api/types';

/** Backend kuralı: FAILED ya da eskimiş sonuç için son istekten 10 dk sonra. */
export const ASSESSMENT_RETRY_AFTER_MS = 10 * 60 * 1000;
/** Backend kuralı: 30 dk'dan eski PENDING istek yenisiyle değiştirilebilir. */
export const ASSESSMENT_STALE_PENDING_MS = 30 * 60 * 1000;

/**
 * Yeni istek ne zaman gönderilebilir? `null`: düğme hiç gösterilmez
 * (sonuç güncel ya da istek henüz sürüyor).
 */
export function requestAvailableAt(
  data: HealthAssessmentResponse | undefined,
): number | null {
  if (!data) return 0;
  const requestedAt = Date.parse(data.requestedAt);
  const base = Number.isNaN(requestedAt) ? 0 : requestedAt;
  if (data.status === HealthAssessmentStatus.PENDING) {
    return base + ASSESSMENT_STALE_PENDING_MS;
  }
  if (data.status === HealthAssessmentStatus.READY && !data.isStale) {
    return null;
  }
  return base + ASSESSMENT_RETRY_AFTER_MS;
}
