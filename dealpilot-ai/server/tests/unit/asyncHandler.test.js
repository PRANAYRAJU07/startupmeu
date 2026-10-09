import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../../src/common/utils/asyncHandler.js';

describe('asyncHandler', () => {
  it('calls next with error when async fn rejects', async () => {
    const error = new Error('async failure');
    const fn = async () => { throw error; };
    const next = vi.fn();
    const handler = asyncHandler(fn);
    await handler({}, {}, next);
    expect(next).toHaveBeenCalledWith(error);
  });

  it('calls the handler normally when no error', async () => {
    const res = { json: vi.fn() };
    const fn = async (_req, r) => { r.json({ ok: true }); };
    const next = vi.fn();
    const handler = asyncHandler(fn);
    await handler({}, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });
});
