/**
 * Bounded exponential backoff for the Google Sheets sync queue (Phase 3).
 * Deliberately deterministic when jitter is disabled (unit-tested).
 */

export const MAX_ATTEMPTS = 8;
export const BASE_DELAY_SECONDS = 30;
export const MAX_DELAY_SECONDS = 15 * 60; // 15-minute cap

/**
 * Delay before attempt `attempt + 1` (attempt is the number of tries already
 * made, starting at 1). 30s, 1m, 2m, 4m, 8m, then capped at 15m.
 */
export function backoffDelaySeconds(attempt: number, jitter = true): number {
  const exp = Math.max(0, attempt - 1);
  const raw = BASE_DELAY_SECONDS * Math.pow(2, exp);
  const capped = Math.min(raw, MAX_DELAY_SECONDS);
  if (!jitter) return Math.round(capped);
  const factor = 0.8 + Math.random() * 0.4; // ±20 %
  return Math.max(1, Math.round(capped * factor));
}

export function shouldRetry(attempt: number): boolean {
  return attempt < MAX_ATTEMPTS;
}

export function nextRetryAt(attempt: number, from: Date = new Date(), jitter = true): Date {
  return new Date(from.getTime() + backoffDelaySeconds(attempt, jitter) * 1000);
}
