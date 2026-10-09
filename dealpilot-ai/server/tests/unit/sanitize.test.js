import { describe, it, expect } from 'vitest';
import { sanitizeMongoQuery, sanitizeForCsv } from '../../src/common/utils/sanitize.js';

describe('sanitizeMongoQuery', () => {
  it('removes keys starting with $', () => {
    const result = sanitizeMongoQuery({ $where: '1==1', name: 'test' });
    expect(result).not.toHaveProperty('$where');
    expect(result.name).toBe('test');
  });

  it('recursively sanitizes nested objects', () => {
    const result = sanitizeMongoQuery({ user: { $ne: null, id: '123' } });
    expect(result.user).not.toHaveProperty('$ne');
    expect(result.user.id).toBe('123');
  });

  it('returns non-objects unchanged', () => {
    expect(sanitizeMongoQuery('hello')).toBe('hello');
    expect(sanitizeMongoQuery(42)).toBe(42);
    expect(sanitizeMongoQuery(null)).toBe(null);
  });

  it('handles arrays', () => {
    const result = sanitizeMongoQuery([{ $gt: 5 }, { value: 10 }]);
    expect(result[0]).not.toHaveProperty('$gt');
    expect(result[1].value).toBe(10);
  });
});

describe('sanitizeForCsv', () => {
  it('prepends apostrophe to strings starting with =', () => {
    expect(sanitizeForCsv('=SUM(A1)')).toBe("'=SUM(A1)");
  });

  it('prepends apostrophe to strings starting with +', () => {
    expect(sanitizeForCsv('+CMD')).toBe("'+CMD");
  });

  it('prepends apostrophe to strings starting with -', () => {
    expect(sanitizeForCsv('-bad')).toBe("'-bad");
  });

  it('prepends apostrophe to strings starting with @', () => {
    expect(sanitizeForCsv('@SUM')).toBe("'@SUM");
  });

  it('leaves safe strings unchanged', () => {
    expect(sanitizeForCsv('hello world')).toBe('hello world');
  });

  it('returns non-strings unchanged', () => {
    expect(sanitizeForCsv(42)).toBe(42);
    expect(sanitizeForCsv(null)).toBe(null);
  });
});
