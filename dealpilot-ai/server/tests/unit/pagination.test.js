import { describe, it, expect } from 'vitest';
import { parsePagination, buildPaginationMeta } from '../../src/common/utils/pagination.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../src/common/constants/index.js';

describe('parsePagination', () => {
  it('uses defaults when no query params', () => {
    const result = parsePagination({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(DEFAULT_PAGE_SIZE);
    expect(result.skip).toBe(0);
  });

  it('parses page and limit from query', () => {
    const result = parsePagination({ page: '3', limit: '10' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.skip).toBe(20);
  });

  it('clamps page to minimum 1', () => {
    const result = parsePagination({ page: '-5' });
    expect(result.page).toBe(1);
  });

  it('caps limit at MAX_PAGE_SIZE', () => {
    const result = parsePagination({ limit: '9999' });
    expect(result.limit).toBe(MAX_PAGE_SIZE);
  });

  it('clamps limit to minimum 1', () => {
    const result = parsePagination({ limit: '0' });
    expect(result.limit).toBe(1);
  });
});

describe('buildPaginationMeta', () => {
  it('calculates totalPages correctly', () => {
    const meta = buildPaginationMeta(100, 1, 20);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(false);
  });

  it('rounds up totalPages', () => {
    const meta = buildPaginationMeta(21, 1, 20);
    expect(meta.totalPages).toBe(2);
  });

  it('shows hasPrev on subsequent pages', () => {
    const meta = buildPaginationMeta(100, 2, 20);
    expect(meta.hasPrev).toBe(true);
    expect(meta.hasNext).toBe(true);
  });

  it('handles last page correctly', () => {
    const meta = buildPaginationMeta(40, 2, 20);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });
});
