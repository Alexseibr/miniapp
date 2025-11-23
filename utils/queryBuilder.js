const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseBoolean(value) {
  if (value === 'true' || value === true || value === '1' || value === 1) {
    return true;
  }
  if (value === 'false' || value === false || value === '0' || value === 0) {
    return false;
  }
  return null;
}

function normalizeSeasonCode(code) {
  if (!code) return null;
  return String(code).toLowerCase();
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildAdQuery(query = {}) {
  const {
    category,
    lat,
    lng,
    distance,
    minPrice,
    maxPrice,
    status,
    sellerId,
    season,
    limit,
    offset,
  } = query;

  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  if (sellerId) {
    filter.sellerId = Number(sellerId);
  }

  if (season) {
    const normalizedSeason = normalizeSeasonCode(season);
    if (normalizedSeason) {
      filter.seasonCodes = normalizedSeason;
    }
  }

  const priceFilter = {};
  const minPriceNumber = parseNumber(minPrice);
  const maxPriceNumber = parseNumber(maxPrice);

  if (minPriceNumber !== null) {
    priceFilter.$gte = minPriceNumber;
  }

  if (maxPriceNumber !== null) {
    priceFilter.$lte = maxPriceNumber;
  }

  if (Object.keys(priceFilter).length > 0) {
    filter.price = priceFilter;
  }

  const parsedLimit = parseNumber(limit);
  const parsedOffset = parseNumber(offset);

  const finalLimit =
    parsedLimit !== null && parsedLimit > 0 ? Math.min(parsedLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  const finalOffset = parsedOffset !== null && parsedOffset >= 0 ? parsedOffset : 0;

  return {
    filter,
    limit: finalLimit,
    offset: finalOffset,
  };
}

export { buildAdQuery };
