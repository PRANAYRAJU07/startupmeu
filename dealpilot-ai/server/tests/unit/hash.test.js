import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, hashToken, generateSecureToken } from '../../src/common/utils/hash.js';

describe('hashPassword / comparePassword', () => {
  it('returns true for a matching pair', async () => {
    const hash = await hashPassword('secret123');
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe('secret123');
    const match = await comparePassword('secret123', hash);
    expect(match).toBe(true);
  });

  it('returns false for a mismatch', async () => {
    const hash = await hashPassword('secret123');
    const match = await comparePassword('wrongpassword', hash);
    expect(match).toBe(false);
  });
});

describe('hashToken', () => {
  it('returns a 64-char hex string', () => {
    const token = hashToken('test-token-value');
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });
});

describe('generateSecureToken', () => {
  it('returns a 64-char hex string by default', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(64);
  });

  it('generates unique tokens', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken());
  });
});
