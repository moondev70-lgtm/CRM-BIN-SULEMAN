import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Meta webhook request verification (X-Hub-Signature-256).
 * Used by /api/webhooks/meta in Phase 2; implemented and unit-tested now.
 */

export function computeMetaSignature(payload: string, appSecret: string): string {
  return `sha256=${createHmac('sha256', appSecret).update(payload).digest('hex')}`;
}

/**
 * Constant-time verification of Meta's HMAC header against the raw body.
 * Fails closed on any missing input.
 */
export function verifyMetaSignature(
  payload: string,
  header: string | null | undefined,
  appSecret: string,
): boolean {
  if (!header || !appSecret) return false;
  const expected = Buffer.from(computeMetaSignature(payload, appSecret), 'utf8');
  const received = Buffer.from(header, 'utf8');
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}
