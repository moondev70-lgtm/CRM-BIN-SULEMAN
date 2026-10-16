import { describe, expect, it } from 'vitest';
import { computeMetaSignature, verifyMetaSignature } from '@/lib/meta/signature';

const SECRET = 'test-app-secret';
const BODY = JSON.stringify({ object: 'leadgen', entry: [{ id: 'x' }] });

describe('computeMetaSignature', () => {
  it('produces a sha256= hex digest prefix', () => {
    const sig = computeMetaSignature(BODY, SECRET);
    expect(sig.startsWith('sha256=')).toBe(true);
    expect(sig).toHaveLength('sha256='.length + 64);
  });
});

describe('verifyMetaSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyMetaSignature(BODY, computeMetaSignature(BODY, SECRET), SECRET)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const sig = computeMetaSignature(BODY, SECRET);
    expect(verifyMetaSignature(BODY + ' ', sig, SECRET)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const sig = computeMetaSignature(BODY, 'other-secret');
    expect(verifyMetaSignature(BODY, sig, SECRET)).toBe(false);
  });

  it('fails closed on missing inputs', () => {
    expect(verifyMetaSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, 'sha256=abc', '')).toBe(false);
  });

  it('rejects a header of different length', () => {
    expect(verifyMetaSignature(BODY, 'sha256=short', SECRET)).toBe(false);
  });
});