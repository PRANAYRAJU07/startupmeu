export function success(res, data, statusCode = 200, meta = null) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function paginated(res, data, paginationMeta) {
  return res.json({ success: true, data, meta: paginationMeta });
}

export function created(res, data) {
  return success(res, data, 201);
}
