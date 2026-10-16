import { describe, expect, it } from 'vitest';
import { buildInquiryMessage, normalizePhone, waLink } from '@/lib/whatsapp';

describe('normalizePhone', () => {
  it('normalizes Pakistani local format with leading zero', () => {
    expect(normalizePhone('0300 9484188')).toBe('+923009484188');
    expect(normalizePhone('0300-9484188')).toBe('+923009484188');
  });

  it('keeps already-normalized E.164 input', () => {
    expect(normalizePhone('+92 300 9484188')).toBe('+923009484188');
    expect(normalizePhone('+923009484188')).toBe('+923009484188');
  });

  it('handles 00-prefixed international dialing', () => {
    expect(normalizePhone('00923009484188')).toBe('+923009484188');
  });

  it('handles country code without leading zero', () => {
    expect(normalizePhone('923009484188')).toBe('+923009484188');
    expect(normalizePhone('3009484188')).toBe('+923009484188');
  });

  it('keeps other international numbers with +', () => {
    expect(normalizePhone('+1 415 555 2671')).toBe('+14155552671');
  });

  it('returns null for garbage', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('12345')).toBeNull(); // too short
    expect(normalizePhone('1234567890123456')).toBeNull(); // too long
  });
});

describe('waLink', () => {
  it('builds a plain wa.me link', () => {
    expect(waLink('+923009484188')).toBe('https://wa.me/923009484188');
  });

  it('URL-encodes the prefilled message', () => {
    const link = waLink('+923009484188', 'Salam & thanks!');
    expect(link).toBe('https://wa.me/923009484188?text=Salam%20%26%20thanks!');
  });
});

describe('buildInquiryMessage', () => {
  it('includes the lead name when provided', () => {
    expect(buildInquiryMessage('Ahmed')).toContain('Ahmed');
    expect(buildInquiryMessage('Ahmed')).toContain('Bin Suleman');
  });

  it('falls back gracefully when name is missing', () => {
    expect(buildInquiryMessage(null)).toContain('there');
    expect(buildInquiryMessage('   ')).toContain('there');
  });
});