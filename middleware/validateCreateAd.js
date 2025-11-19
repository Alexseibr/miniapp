const Season = require('../models/Season');

const ALLOWED_DELIVERY_TYPES = ['pickup_only', 'delivery_only', 'delivery_and_pickup'];
const CATEGORY_DEFAULT_LIFETIME = {
  berries: 3,
  berries_fresh: 3,
  flowers: 3,
  flowers_tulips: 3,
  tulips_single: 3,
  tulips_bouquets: 3,
  farm: 3,
  craft: 7,
  cakes: 7,
  bakery: 7,
  eclairs: 7,
  artisans: 7,
  services: 14,
  service: 14,
  real_estate: 30,
  apartments: 30,
  housing: 30,
  auto: 30,
  cars: 30,
};
const DEFAULT_LIFETIME_DAYS = 7;
const MAX_LIFETIME_DAYS = 30;

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSlug(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.toLowerCase() : '';
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function parsePositiveNumber(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }
  return numberValue;
}

function getDefaultLifetimeDays(categoryId, subcategoryId) {
  const subKey = normalizeSlug(subcategoryId);
  if (subKey && CATEGORY_DEFAULT_LIFETIME[subKey]) {
    return CATEGORY_DEFAULT_LIFETIME[subKey];
  }
  const catKey = normalizeSlug(categoryId);
  if (catKey && CATEGORY_DEFAULT_LIFETIME[catKey]) {
    return CATEGORY_DEFAULT_LIFETIME[catKey];
  }
  return DEFAULT_LIFETIME_DAYS;
}

function calculateValidUntil(baseDate, lifetimeDays) {
  const start = baseDate instanceof Date ? new Date(baseDate) : new Date();
  const duration = Number.isFinite(lifetimeDays) ? Number(lifetimeDays) : DEFAULT_LIFETIME_DAYS;
  const result = new Date(start);
  result.setDate(result.getDate() + duration);
  return result;
}

async function validateSeason(seasonCode) {
  if (!seasonCode) {
    return null;
  }
  const season = await Season.findOne({ code: seasonCode.toLowerCase() });
  if (!season) {
    throw new Error('season not found');
  }
  if (!season.isActive) {
    throw new Error('season is not active');
  }
  const now = new Date();
  if (season.endDate && season.endDate < now) {
    throw new Error('season expired');
  }
  return season.code;
}

async function validateCreateAd(req, res, next) {
  try {
    const payload = req.body || {};

    const title = normalizeString(payload.title);
    if (!title || title.length < 3 || title.length > 120) {
      return res.status(400).json({ error: 'Поле title обязательно (3-120 символов)' });
    }

    const categoryId = normalizeSlug(payload.categoryId);
    if (!categoryId) {
      return res.status(400).json({ error: 'Поле categoryId обязательно' });
    }

    const subcategoryId = normalizeSlug(payload.subcategoryId);
    if (!subcategoryId) {
      return res.status(400).json({ error: 'Поле subcategoryId обязательно' });
    }

    const price = parsePositiveNumber(payload.price);
    if (!price) {
      return res.status(400).json({ error: 'Поле price должно быть положительным числом' });
    }

    const sellerTelegramId = parsePositiveNumber(payload.sellerTelegramId);
    if (!sellerTelegramId) {
      return res.status(400).json({ error: 'Поле sellerTelegramId обязательно' });
    }

    let deliveryType = null;
    if (payload.deliveryType != null) {
      const normalizedDeliveryType = payload.deliveryType;
      if (!ALLOWED_DELIVERY_TYPES.includes(normalizedDeliveryType)) {
        return res.status(400).json({ error: 'deliveryType имеет недопустимое значение' });
      }
      deliveryType = normalizedDeliveryType;
    }

    let deliveryRadiusKm = null;
    if (deliveryType && deliveryType.includes('delivery')) {
      deliveryRadiusKm = parsePositiveNumber(payload.deliveryRadiusKm);
      if (!deliveryRadiusKm) {
        return res.status(400).json({ error: 'deliveryRadiusKm обязателен для доставки' });
      }
    } else if (payload.deliveryRadiusKm != null) {
      const parsedRadius = parsePositiveNumber(payload.deliveryRadiusKm);
      if (!parsedRadius) {
        return res.status(400).json({ error: 'deliveryRadiusKm должно быть положительным числом' });
      }
      deliveryRadiusKm = parsedRadius;
    }

    let attributes = {};
    if (payload.attributes != null) {
      if (!isPlainObject(payload.attributes)) {
        return res.status(400).json({ error: 'attributes должен быть объектом' });
      }
      attributes = { ...payload.attributes };
    }

    let location = undefined;
    if (payload.location != null) {
      if (!isPlainObject(payload.location)) {
        return res.status(400).json({ error: 'location должен быть объектом' });
      }
      const lat = Number(payload.location.lat);
      const lng = Number(payload.location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ error: 'location.lat и location.lng обязательны' });
      }
      location = { lat, lng };
    }

    const photos = Array.isArray(payload.photos)
      ? payload.photos
          .filter((photo) => typeof photo === 'string' && photo.trim())
          .map((photo) => photo.trim())
      : [];

    let seasonCode = null;
    if (payload.seasonCode) {
      try {
        seasonCode = await validateSeason(payload.seasonCode);
      } catch (seasonError) {
        return res.status(400).json({ error: seasonError.message });
      }
    }

    let lifetimeDays = Number(payload.lifetimeDays);
    if (!Number.isFinite(lifetimeDays) || lifetimeDays <= 0) {
      lifetimeDays = getDefaultLifetimeDays(categoryId, subcategoryId);
    }
    lifetimeDays = Math.min(lifetimeDays, MAX_LIFETIME_DAYS);

    const validUntil = calculateValidUntil(new Date(), lifetimeDays);

    const sanitized = {
      title,
      description: normalizeString(payload.description),
      categoryId,
      subcategoryId,
      price,
      currency: normalizeString(payload.currency) || 'BYN',
      photos,
      attributes,
      sellerTelegramId,
      deliveryType,
      deliveryRadiusKm,
      location,
      seasonCode,
      lifetimeDays,
      validUntil,
      moderationStatus: 'pending',
      status: 'active',
      deliveryOptions: Array.isArray(payload.deliveryOptions)
        ? payload.deliveryOptions.filter((option) => typeof option === 'string' && option.trim())
        : undefined,
      isLiveSpot: Boolean(payload.isLiveSpot),
    };

    // Remove undefined optional fields
    if (!sanitized.deliveryType) {
      delete sanitized.deliveryType;
    }
    if (!sanitized.deliveryRadiusKm && sanitized.deliveryRadiusKm !== 0) {
      delete sanitized.deliveryRadiusKm;
    }
    if (!sanitized.location) {
      delete sanitized.location;
    }
    if (!sanitized.seasonCode) {
      delete sanitized.seasonCode;
    }
    if (!sanitized.deliveryOptions || !sanitized.deliveryOptions.length) {
      delete sanitized.deliveryOptions;
    }

    req.validatedAdPayload = sanitized;
    next();
  } catch (error) {
    console.error('validateCreateAd error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  validateCreateAd,
  getDefaultLifetimeDays,
  calculateValidUntil,
};
