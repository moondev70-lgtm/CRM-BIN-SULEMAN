import { describe, expect, it } from 'vitest';
import {
  BASE_DELAY_SECONDS,
  MAX_ATTEMPTS,
  MAX_DELAY_SECONDS,
  backoffDelaySeconds,
  nextRetryAt,
  shouldRetry,
} from '@/lib/queue/backoff';

describe('backoffDelaySeconds (deterministic, no jitter)', () => {
  it('doubles each attempt from the base delay', () => {
    expect(backoffDelaySeconds(1, false)).toBe(30);
    expect(backoffDelaySeconds(2, false)).toBe(60);
    expect(backoffDelaySeconds(3, false)).toBe(120);
    expect(backoffDelaySeconds(4, false)).toBe(240);
    expect(backoffDelaySeconds(5, false)).toBe(480);
  });

  it('caps at MAX_DELAY_SECONDS', () => {
    expect(backoffDelaySeconds(6, false)).toBe(MAX_DELAY_SECONDS);
    expect(backoffDelaySeconds(10, false)).toBe(MAX_DELAY_SECONDS);
    expect(MAX_DELAY_SECONDS).toBe(900);
    expect(BASE_DELAY_SECONDS).toBe(30);
  });

  it('stays within ±25% when jitter is enabled', () => {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const raw = backoffDelaySeconds(attempt, false);
      const jittered = backoffDelaySeconds(attempt, true);
      expect(jittered).toBeGreaterThanOrEqual(Math.floor(raw * 0.75));
      expect(jittered).toBeLessThanOrEqual(Math.ceil(raw * 1.25));
    }
  });
});

describe('shouldRetry', () => {
  it('allows up to MAX_ATTEMPTS', () => {
    expect(MAX_ATTEMPTS).toBe(8);
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(7)).toBe(true);
    expect(shouldRetry(8)).toBe(false);
  });
});

describe('nextRetryAt', () => {
  it('projects the next attempt time from a fixed instant', () => {
    const from = new Date('2026-10-15T00:00:00Z');
    const next = nextRetryAt(1, from, false);
    expect(next.getTime() - from.getTime()).toBe(30_000);
  });
});