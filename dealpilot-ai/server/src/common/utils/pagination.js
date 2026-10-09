import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

export function parsePagination(query) {
  const parsedPage = parseInt(query.page, 10);
  const parsedLimit = parseInt(query.limit, 10);

  const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
  const rawLimit = Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
