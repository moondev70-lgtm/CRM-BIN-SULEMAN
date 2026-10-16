import { describe, expect, it } from 'vitest';
import { LEAD_STATUSES, allowedTransitions, canTransition, isTerminalStatus } from '@/lib/leads';

describe('lead status flow', () => {
  it('defines every status exactly once', () => {
    expect(LEAD_STATUSES).toHaveLength(8);
    expect(new Set(LEAD_STATUSES).size).toBe(8);
  });

  it('allows the happy path', () => {
    expect(canTransition('new', 'contacted')).toBe(true);
    expect(canTransition('contacted', 'follow_up')).toBe(true);
    expect(canTransition('follow_up', 'qualified')).toBe(true);
    expect(canTransition('qualified', 'appointment')).toBe(true);
    expect(canTransition('appointment', 'won')).toBe(true);
  });

  it('blocks skipping the pipeline', () => {
    expect(canTransition('new', 'won')).toBe(false);
    expect(canTransition('new', 'appointment')).toBe(false);
    expect(canTransition('contacted', 'won')).toBe(false);
  });

  it('treats won as terminal', () => {
    expect(isTerminalStatus('won')).toBe(true);
    expect(allowedTransitions('won')).toHaveLength(0);
    expect(canTransition('won', 'lost')).toBe(false);
  });

  it('allows reopening lost/unqualified leads', () => {
    expect(canTransition('lost', 'new')).toBe(true);
    expect(canTransition('unqualified', 'new')).toBe(true);
  });

  it('never allows a no-op transition', () => {
    for (const s of LEAD_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});