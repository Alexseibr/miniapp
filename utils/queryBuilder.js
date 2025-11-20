const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseBoolean(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

function normalizeSeasonCode(code) {
  if (typeof code !== 'string') {
    return undefined;
  }

  const trimmed = code.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildAdQuery(query = {}) {
  const filters = { moderationStatus: 'approved' };
  const sort = {};
  let sortBy = 'date_desc';

  const {
    categoryId,
    subcategoryId,
    categoryCode,
    subcategoryCode,
    seasonCode,
    minPrice,
    maxPrice,
    priceMin,
    priceMax,
    search,
    q,
    sellerId,
    sellerTelegramId,
    sortBy: sortByQuery,
    sort: legacySort,
    page: pageRaw,
    limit: limitRaw,
    includeExpired,
  } = query;

  const includeExpiredFlag = parseBoolean(includeExpired);
  if (includeExpiredFlag) {
    filters.status = { $in: ['active', 'expired'] };
  } else {
    filters.status = 'active';
  }

  if (categoryId) {
    filters.categoryId = categoryId;
  }

  if (subcategoryId) {
    filters.subcategoryId = subcategoryId;
  }

  if (categoryCode) {
    filters.categoryCode = categoryCode;
  }

  if (subcategoryCode) {
    filters.subcategoryCode = subcategoryCode;
  }

  const normalizedSeason = normalizeSeasonCode(seasonCode);
  if (normalizedSeason) {
    filters.seasonCode = normalizedSeason;
  }

  const minPriceNumber = parseNumber(priceMin ?? minPrice);
  const maxPriceNumber = parseNumber(priceMax ?? maxPrice);
  if (minPriceNumber != null || maxPriceNumber != null) {
    filters.price = { ...filters.price };
    if (minPriceNumber != null) {
      filters.price.$gte = minPriceNumber;
    }
    if (maxPriceNumber != null) {
      filters.price.$lte = maxPriceNumber;
    }
  }

  const searchTerm = search || q;
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    filters.$or = [{ title: regex }, { description: regex }];
  }

  const sellerNumber = parseNumber(sellerId ?? sellerTelegramId);
  if (sellerNumber != null && sellerNumber > 0) {
    filters.sellerTelegramId = sellerNumber;
  }

  const requestedSort = (sortByQuery || legacySort || '').toLowerCase();
  switch (requestedSort) {
    case 'date_asc':
      sort.createdAt = 1;
      sortBy = 'date_asc';
      break;
    case 'price_asc':
      sort.price = 1;
      sortBy = 'price_asc';
      break;
    case 'price_desc':
      sort.price = -1;
      sortBy = 'price_desc';
      break;
    case 'distance':
      sort.createdAt = -1;
      sortBy = 'distance';
      break;
    case 'date_desc':
    default:
      sort.createdAt = -1;
      sortBy = 'date_desc';
      break;
  }

  const parsedPage = parseNumber(pageRaw);
  const page = parsedPage && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const parsedLimit = parseNumber(limitRaw);
  const limit = parsedLimit && parsedLimit > 0 ? Math.min(Math.floor(parsedLimit), MAX_LIMIT) : DEFAULT_LIMIT;

  // Остальные query-параметры интерпретируем как фильтры по attributes
  const reservedKeys = new Set([
    'categoryid',
    'subcategoryid',
    'categorycode',
    'subcategorycode',
    'seasoncode',
    'minprice',
    'maxprice',
    'pricemin',
    'pricemax',
    'search',
    'q',
    'sellerid',
    'sellertelegramid',
    'sortby',
    'sort',
    'page',
    'limit',
    'includeexpired',
    'lat',
    'lng',
    'radiuskm',
    'maxdistancekm',
  ]);

  Object.entries(query || {}).forEach(([key, value]) => {
    const normalizedKey = String(key).toLowerCase();
    if (reservedKeys.has(normalizedKey)) {
      return;
    }

    if (value === undefined || value === null || value === '') {
      return;
    }

    const numericValue = parseNumber(value);
    const filterValue = numericValue != null ? numericValue : value;
    filters[`attributes.${key}`] = filterValue;
  });

  return {
    filters,
    sort,
    page,
    limit,
    sortBy,
  };
}

module.exports = {
  buildAdQuery,
};
