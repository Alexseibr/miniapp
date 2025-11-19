const { Router } = require('express');
const Ad = require('../../models/Ad.js');
const { haversineDistanceKm } = require('../../utils/distance');
const { notifySubscribers } = require('../../services/notifications');

const router = Router();

const SEASON_SHORT_LIFETIME = {
  march8_tulips: 3,
};

const CATEGORY_LIFETIME_RULES = {
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

const DEFAULT_EXTENSION_DAYS = 7;

function normalizeSeasonCode(code) {
  if (typeof code !== 'string') {
    return undefined;
  }

  return code.trim().toLowerCase();
}

function parseSellerId(raw) {
  const sellerId = Number(raw);
  if (!Number.isFinite(sellerId) || sellerId <= 0) {
    return null;
  }

  return sellerId;
}

function getSellerIdFromRequest(req) {
  return (
    parseSellerId(req?.body?.sellerTelegramId) ||
    parseSellerId(req?.query?.sellerTelegramId)
  );
}

async function findAdOwnedBySeller(adId, sellerId) {
  const ad = await Ad.findById(adId);

  if (!ad) {
    const error = new Error('Объявление не найдено');
    error.status = 404;
    throw error;
  }

  if (ad.sellerTelegramId !== sellerId) {
    const error = new Error('Недостаточно прав для управления этим объявлением');
    error.status = 403;
    throw error;
  }

  return ad;
}

function resolveExtensionDays(ad) {
  const subKey = ad?.subcategoryId ? ad.subcategoryId.toLowerCase() : null;
  if (subKey && CATEGORY_LIFETIME_RULES[subKey]) {
    return CATEGORY_LIFETIME_RULES[subKey];
  }

  const catKey = ad?.categoryId ? ad.categoryId.toLowerCase() : null;
  if (catKey && CATEGORY_LIFETIME_RULES[catKey]) {
    return CATEGORY_LIFETIME_RULES[catKey];
  }

  if (ad?.seasonCode) {
    const normalizedSeason = normalizeSeasonCode(ad.seasonCode);
    if (normalizedSeason && SEASON_SHORT_LIFETIME[normalizedSeason]) {
      return SEASON_SHORT_LIFETIME[normalizedSeason];
    }
  }

  if (Number.isFinite(ad?.lifetimeDays) && ad.lifetimeDays > 0) {
    return ad.lifetimeDays;
  }

  return DEFAULT_EXTENSION_DAYS;
}

function extendAdLifetime(ad, extensionDays) {
  const now = new Date();
  const base = ad.validUntil && ad.validUntil > now ? new Date(ad.validUntil) : now;
  const extended = new Date(base);
  extended.setDate(extended.getDate() + extensionDays);

  ad.validUntil = extended;
  ad.lifetimeDays = extensionDays;
}

async function applyLiveSpotStatus(ad, isLiveSpot) {
  ad.isLiveSpot = Boolean(isLiveSpot);
  await ad.save();
  return ad;
}

function extractAdCoordinates(ad) {
  if (ad?.location && ad.location.lat != null && ad.location.lng != null) {
    return {
      lat: Number(ad.location.lat),
      lng: Number(ad.location.lng),
    };
  }

  if (ad?.location?.geo?.coordinates && ad.location.geo.coordinates.length === 2) {
    const [lng, lat] = ad.location.geo.coordinates;
    return {
      lat: Number(lat),
      lng: Number(lng),
    };
  }

  if (ad?.geo?.coordinates && ad.geo.coordinates.length === 2) {
    const [lng, lat] = ad.geo.coordinates;
    return {
      lat: Number(lat),
      lng: Number(lng),
    };
  }

  return null;
}

function projectAdsWithinRadius(ads, { latNumber, lngNumber, radiusKm }) {
  const radiusLimit = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : null;
  const projected = [];

  for (const ad of ads) {
    const coordinates = extractAdCoordinates(ad);
    if (!coordinates) {
      continue;
    }

    const distanceKm = haversineDistanceKm(latNumber, lngNumber, coordinates.lat, coordinates.lng);
    if (distanceKm == null) {
      continue;
    }

    if (radiusLimit && distanceKm > radiusLimit) {
      continue;
    }

    const plain =
      typeof ad.toObject === 'function'
        ? ad.toObject({ getters: true, virtuals: false })
        : { ...ad };
    plain.distanceKm = Number(distanceKm.toFixed(2));
    projected.push(plain);
  }

  return projected;
}

async function aggregateNearbyAds({ latNumber, lngNumber, radiusKm, limit, baseFilter }) {
  const finalRadiusKm = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 5;
  const finalLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20;

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lngNumber, latNumber],
        },
        distanceField: 'distanceMeters',
        maxDistance: finalRadiusKm * 1000,
        spherical: true,
        query: baseFilter,
        key: 'location.geo',
      },
    },
    { $limit: finalLimit },
  ];

  const items = await Ad.aggregate(pipeline);

  return items.map((item) => ({
    ...item,
    distanceKm: Number(((item.distanceMeters || 0) / 1000).toFixed(2)),
  }));
}

router.get('/', async (req, res, next) => {
  try {
    const {
      categoryId,
      subcategoryId,
      seasonCode,
      sellerTelegramId,
      limit = 20,
      offset = 0,
      q,
      minPrice,
      maxPrice,
      sort = 'newest',
      lat,
      lng,
      radiusKm,
    } = req.query;

    const query = { status: 'active', moderationStatus: 'approved' };

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    const normalizedSeason = normalizeSeasonCode(seasonCode);
    if (normalizedSeason) query.seasonCode = normalizedSeason;

    if (sellerTelegramId !== undefined) {
      const sellerIdNumber = Number(sellerTelegramId);
      if (!Number.isNaN(sellerIdNumber)) {
        query.sellerTelegramId = sellerIdNumber;
      }
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      query.$or = [{ title: regex }, { description: regex }];
    }

    if (minPrice !== undefined) {
      const minPriceNumber = Number(minPrice);
      if (!Number.isNaN(minPriceNumber)) {
        query.price = { ...(query.price || {}), $gte: minPriceNumber };
      }
    }

    if (maxPrice !== undefined) {
      const maxPriceNumber = Number(maxPrice);
      if (!Number.isNaN(maxPriceNumber)) {
        query.price = { ...(query.price || {}), $lte: maxPriceNumber };
      }
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);
    const hasGeoQuery =
      Number.isFinite(latNumber) &&
      Number.isFinite(lngNumber) &&
      Number.isFinite(radiusNumber) &&
      radiusNumber > 0;

    let sortObj = { createdAt: -1 };
    if (!hasGeoQuery && sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    let baseItems;

    if (hasGeoQuery) {
      baseItems = await Ad.find(query)
        .sort({ createdAt: -1 })
        .limit(500);
    } else {
      baseItems = await Ad.find(query)
        .sort(sortObj)
        .skip(finalOffset)
        .limit(finalLimit);
    }

    if (!hasGeoQuery) {
      return res.json({ items: baseItems });
    }

    const itemsWithDistance = projectAdsWithinRadius(baseItems, {
      latNumber,
      lngNumber,
      radiusKm: radiusNumber,
    });

    if (sort === 'distance') {
      itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      itemsWithDistance.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

router.get('/near', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radiusKm = 5,
      categoryId,
      subcategoryId,
      seasonCode,
      limit = 20,
    } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }

    const normalizedSeason = normalizeSeasonCode(seasonCode);

    const baseFilter = { status: 'active', moderationStatus: 'approved' };
    if (categoryId) baseFilter.categoryId = categoryId;
    if (subcategoryId) baseFilter.subcategoryId = subcategoryId;
    if (normalizedSeason) baseFilter.seasonCode = normalizedSeason;

    const items = await aggregateNearbyAds({
      latNumber,
      lngNumber,
      radiusKm: Number(radiusKm),
      limit: Number(limit),
      baseFilter,
    });

    return res.json({ items });
  } catch (error) {
    console.error('GET /api/ads/near error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/ads/nearby
router.get('/nearby', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radiusKm = 10,
      categoryId,
      subcategoryId,
      seasonCode,
      limit = 20,
    } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ error: 'lat and lng must be valid numbers' });
    }

    const normalizedSeason = normalizeSeasonCode(seasonCode);

    const baseFilter = { status: 'active', moderationStatus: 'approved' };
    if (categoryId) baseFilter.categoryId = categoryId;
    if (subcategoryId) baseFilter.subcategoryId = subcategoryId;
    if (normalizedSeason) baseFilter.seasonCode = normalizedSeason;

    const items = await aggregateNearbyAds({
      latNumber,
      lngNumber,
      radiusKm: Number(radiusKm),
      limit: Number(limit),
      baseFilter,
    });

    return res.json({ items });
  } catch (error) {
    console.error('GET /api/ads/nearby error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/season/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { limit = 20, offset = 0, sort = 'newest', lat, lng, radiusKm } = req.query;

    const seasonCode = normalizeSeasonCode(code);
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);
    const hasGeoQuery =
      Number.isFinite(latNumber) &&
      Number.isFinite(lngNumber) &&
      Number.isFinite(radiusNumber) &&
      radiusNumber > 0;

    let sortObj = { createdAt: -1 };
    if (!hasGeoQuery && sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    if (!hasGeoQuery) {
      const items = await Ad.find({ seasonCode, status: 'active', moderationStatus: 'approved' })
        .sort(sortObj)
        .skip(finalOffset)
        .limit(finalLimit);

      return res.json({ items });
    }

    const baseAds = await Ad.find({ seasonCode, status: 'active', moderationStatus: 'approved' })
      .sort({ createdAt: -1 })
      .limit(500);

    const itemsWithDistance = projectAdsWithinRadius(baseAds, {
      latNumber,
      lngNumber,
      radiusKm: radiusNumber,
    });

    if (sort === 'distance') {
      itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      itemsWithDistance.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

router.get('/season/:code/live', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20, offset = 0 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для live-точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const seasonCode = normalizeSeasonCode(code);
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', moderationStatus: 'approved', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const itemsWithDistance = projectAdsWithinRadius(ads, {
      latNumber,
      lngNumber,
      radiusKm: finalRadiusKm,
    });

    itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

router.get('/my', async (req, res, next) => {
  try {
    const sellerId = parseSellerId(req.query?.sellerTelegramId);

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId query parameter is required' });
    }

    const limitNumber = Number(req.query?.limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 50;

    const ads = await Ad.find({ sellerTelegramId: sellerId })
      .sort({ createdAt: -1 })
      .limit(finalLimit);

    return res.json({ items: ads });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/price', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);
    const newPrice = Number(req.body?.price);

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      return res.status(400).json({ message: 'price must be a positive number' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);
    ad.price = newPrice;
    await ad.save();

    return res.json({ item: ad });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.patch('/:id/photos', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);
    const photos = req.body?.photos;

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    if (!Array.isArray(photos)) {
      return res.status(400).json({ message: 'photos must be an array' });
    }

    const sanitized = photos
      .map((photo) => (typeof photo === 'string' ? photo.trim() : ''))
      .filter(Boolean);

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);
    ad.photos = sanitized;
    await ad.save();

    return res.json({ item: ad, photosCount: sanitized.length });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/extend', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);
    const extensionDays = resolveExtensionDays(ad);
    extendAdLifetime(ad, extensionDays);
    await ad.save();

    return res.json({ item: ad, extendedByDays: extensionDays, validUntil: ad.validUntil });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/liveSpot/on', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);
    await applyLiveSpotStatus(ad, true);

    return res.json({ item: ad, isLiveSpot: ad.isLiveSpot });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/liveSpot/off', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);
    await applyLiveSpotStatus(ad, false);

    return res.json({ item: ad, isLiveSpot: ad.isLiveSpot });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/hide', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);
    const hidden = req.body?.hidden;

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    if (hidden !== undefined && typeof hidden !== 'boolean') {
      return res.status(400).json({ message: 'hidden must be a boolean value' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);

    if (hidden === false) {
      if (ad.status === 'hidden') {
        ad.status = 'active';
      }
    } else {
      ad.status = 'hidden';
      ad.isLiveSpot = false;
    }

    await ad.save();

    return res.json({ item: ad, hidden: ad.status === 'hidden' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/hide', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);
    const hidden = req.body?.hidden;

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    if (hidden !== undefined && typeof hidden !== 'boolean') {
      return res.status(400).json({ message: 'hidden must be a boolean value' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);

    if (hidden === false) {
      if (ad.status === 'hidden') {
        ad.status = 'active';
      }
    } else {
      ad.status = 'hidden';
      ad.isLiveSpot = false;
    }

    await ad.save();

    return res.json({ item: ad, hidden: ad.status === 'hidden' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/hide', async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);
    const hidden = req.body?.hidden;

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerTelegramId is required' });
    }

    if (hidden !== undefined && typeof hidden !== 'boolean') {
      return res.status(400).json({ message: 'hidden must be a boolean value' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);

    if (hidden === false) {
      if (ad.status === 'hidden') {
        ad.status = 'active';
      }
    } else {
      ad.status = 'hidden';
      ad.isLiveSpot = false;
    }

    await ad.save();

    return res.json({ item: ad, hidden: ad.status === 'hidden' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.get('/season/:code/live', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20, offset = 0 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для live-точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const seasonCode = normalizeSeasonCode(code);
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const itemsWithDistance = projectAdsWithinRadius(ads, {
      latNumber,
      lngNumber,
      radiusKm: finalRadiusKm,
    });

    itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

router.get('/season/:code/live', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20, offset = 0 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для live-точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const seasonCode = normalizeSeasonCode(code);
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const itemsWithDistance = projectAdsWithinRadius(ads, {
      latNumber,
      lngNumber,
      radiusKm: finalRadiusKm,
    });

    itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

router.get('/season/:code/live', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20, offset = 0 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для live-точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const seasonCode = normalizeSeasonCode(code);
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const itemsWithDistance = projectAdsWithinRadius(ads, {
      latNumber,
      lngNumber,
      radiusKm: finalRadiusKm,
    });

    itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const finalItems = itemsWithDistance.slice(finalOffset, finalOffset + finalLimit);

    return res.json({ items: finalItems });
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/nearby
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5, categoryId, subcategoryId, limit = 20 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat и lng обязательны' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ error: 'lat и lng должны быть числами' });
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const radiusNumber = Number(radiusKm);
    const finalRadius = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const baseQuery = { status: 'active' };
    if (categoryId) baseQuery.categoryId = categoryId;
    if (subcategoryId) baseQuery.subcategoryId = subcategoryId;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);
    const ads = await Ad.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = getDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);
      if (distanceKm == null || distanceKm > finalRadius) {
        continue;
      }

      const adObject = ad.toObject();
      adObject.distanceKm = distanceKm;
      mapped.push(adObject);
    }

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: mapped.slice(0, finalLimit) });
  } catch (error) {
    console.error('GET /api/ads/nearby error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }
    
    // Увеличиваем счетчик просмотров
    ad.views += 1;
    await ad.save();
    
    res.json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      categoryId,
      subcategoryId,
      price,
      currency,
      photos,
      attributes,
      sellerTelegramId,
      seasonCode,
      deliveryOptions,
      lifetimeDays,
      isLiveSpot,
      location,
    } = req.body;

    if (!title || !categoryId || !subcategoryId || price == null || !sellerTelegramId) {
      return res.status(400).json({
        message: 'Необходимо указать: title, categoryId, subcategoryId, price, sellerTelegramId',
      });
    }

    const normalizedSeason = normalizeSeasonCode(seasonCode);

    const payload = {
      title,
      description,
      categoryId,
      subcategoryId,
      price,
      currency,
      photos,
      attributes,
      sellerTelegramId,
      seasonCode: normalizedSeason,
      deliveryOptions,
      lifetimeDays,
      isLiveSpot,
      location,
      status: 'active',
      moderationStatus: 'pending',
    };

    if (
      (payload.lifetimeDays == null || payload.lifetimeDays <= 0) &&
      normalizedSeason &&
      SEASON_SHORT_LIFETIME[normalizedSeason]
    ) {
      payload.lifetimeDays = SEASON_SHORT_LIFETIME[normalizedSeason];
    }

    const ad = await Ad.create(payload);

    res.status(201).json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/live-spot', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }

    const before = ad.toObject();

    const allowedFields = [
      'price',
      'currency',
      'photos',
      'deliveryType',
      'deliveryRadiusKm',
      'status',
      'isLiveSpot',
      'lifetimeDays',
      'validUntil',
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        ad[field] = req.body[field];
      }
    }

    await ad.save();

    const after = ad.toObject();

    const priceChanged =
      typeof before.price === 'number' &&
      typeof after.price === 'number' &&
      before.price !== after.price;
    const statusChanged =
      typeof before.status === 'string' &&
      typeof after.status === 'string' &&
      before.status !== after.status;

    if (priceChanged) {
      await notifySubscribers(
        ad._id,
        `Цена объявления "${after.title}" изменилась: ${before.price} → ${after.price}`
      );
    }

    if (statusChanged) {
      await notifySubscribers(
        ad._id,
        `Статус объявления "${after.title}" изменился: ${before.status || '—'} → ${after.status}`
      );
    }

    if (statusChanged) {
      await notifySubscribers(
        ad._id,
        `Статус объявления "${after.title}" изменился: ${before.status || '—'} → ${after.status}`
      );
    }

    if (ad.sellerTelegramId !== sellerIdNumber) {
      return res.status(403).json({ message: 'Вы не можете изменять live-spot для этого объявления' });
    }

    ad.isLiveSpot = isLiveSpot;
    await ad.save();

    res.json(ad);
  } catch (error) {
    console.error('PATCH /api/ads/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/live-spot', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLiveSpot } = req.body || {};
    const sellerId = getSellerIdFromRequest(req);

    if (typeof isLiveSpot !== 'boolean') {
      return res.status(400).json({ message: 'Поле isLiveSpot обязательно и должно быть boolean' });
    }

    if (!sellerId) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать корректный sellerTelegramId для проверки прав' });
    }

    const ad = await findAdOwnedBySeller(id, sellerId);
    await applyLiveSpotStatus(ad, isLiveSpot);

    res.json({ item: ad });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    res.json({ message: 'Объявление архивировано', ad });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
