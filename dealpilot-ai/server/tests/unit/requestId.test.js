import { describe, it, expect, vi } from 'vitest';
import { requestId } from '../../src/common/middleware/requestId.js';

describe('requestId middleware', () => {
  it('sets req.id and X-Request-ID header', () => {
    const req = { headers: {} };
    const headers = {};
    const res = {
      setHeader: vi.fn((key, val) => { headers[key] = val; }),
    };
    const next = vi.fn();

    requestId(req, res, next);

    expect(req.id).toBeDefined();
    expect(typeof req.id).toBe('string');
    expect(req.id).toHaveLength(36); // UUID v4 length
    expect(headers['X-Request-ID']).toBe(req.id);
    expect(next).toHaveBeenCalled();
  });

  it('generates different IDs on each call', () => {
    const make = () => {
      const req = { headers: {} };
      const res = { setHeader: vi.fn() };
      const next = vi.fn();
      requestId(req, res, next);
      return req.id;
    };
    expect(make()).not.toBe(make());
  });
});
