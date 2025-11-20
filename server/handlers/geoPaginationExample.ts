// Пример: вставьте в начало handler'а, где парсятся query params
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_RADIUS_KM = 50;

export function parseGeoQueryParams(req: any) {
  const rawLimit = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
  const limit = Number.isNaN(rawLimit) ? DEFAULT_LIMIT : Math.min(rawLimit, MAX_LIMIT);

  const rawRadius = parseFloat(String(req.query.radius ?? 5));
  const radiusKm = Number.isNaN(rawRadius) ? 5 : Math.min(rawRadius, MAX_RADIUS_KM);

  if (limit <= 0) {
    throw new Error('limit must be positive');
  }
  if (radiusKm <= 0) {
    throw new Error('radius must be positive');
  }

  return { limit, radiusKm };
}