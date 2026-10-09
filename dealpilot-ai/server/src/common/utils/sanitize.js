export function sanitizeMongoQuery(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMongoQuery);
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k]) => !k.startsWith('$'))
      .map(([k, v]) => [k, sanitizeMongoQuery(v)]),
  );
}

export function sanitizeForCsv(str) {
  if (typeof str !== 'string') return str;
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}
