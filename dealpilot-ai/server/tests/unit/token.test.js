import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken, generateRefreshToken } from '../../src/common/utils/token.js';

const SECRET = 'a-test-secret-that-is-long-enough-for-jwt-signing';
const TTL = '1h';

describe('generateAccessToken / verifyAccessToken', () => {
  it('round-trips a payload correctly', () => {
    const payload = { sub: 'user123', email: 'test@example.com', role: 'founder' };
    const token = generateAccessToken(payload, SECRET, TTL);
    expect(typeof token).toBe('string');
    const decoded = verifyAccessToken(token, SECRET);
    expect(decoded.sub).toBe('user123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.role).toBe('founder');
  });

  it('throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here', SECRET)).toThrow();
  });

  it('throws on wrong secret', () => {
    const token = generateAccessToken({ sub: 'user123' }, SECRET, TTL);
    expect(() => verifyAccessToken(token, 'wrong-secret')).toThrow();
  });
});

describe('generateRefreshToken', () => {
  it('returns a hex string of 64 characters', () => {
    const token = generateRefreshToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
  });

  it('generates unique tokens', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken());
  });
});
