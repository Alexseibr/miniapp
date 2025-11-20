const { Router } = require('express');
const Ad = require('../../models/Ad.js');
const { haversineDistanceKm } = require('../../utils/distance');
const { buildAdQuery } = require('../../utils/queryBuilder');
const { notifySubscribers } = require('../../services/notifications');
const { findUsersToNotifyOnAdChange } = require('../../services/favoritesNotifications');
const { sendPriceStatusChangeNotifications } = require('../../services/notificationSender');
const { updateAdPrice, updateAdStatus } = require('../../services/adUpdateService');
const { validateCreateAd } = require('../../middleware/validateCreateAd');
const requireInternalAuth = require('../../middleware/internalAuth');
const { auth } = require('../../middleware/auth');
const {
  cacheMiddleware,
  cacheClient,
  buildCacheKeyFromQuery,
} = require('../middleware/cache');

const router = Router();

const ADS_CACHE_PREFIX = 'ads:';
const ADS_LIST_TTL_SECONDS = 45;
const ADS_DETAILS_TTL_SECONDS = 240;
const ADS_NEARBY_TTL_SECONDS = 30;

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

const invalidateAdsCache = () => cacheClient.flushPrefix(ADS_CACHE_PREFIX);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode < 500) {
        invalidateAdsCache();
      }
    });
  }

  next();
});

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
    parseSellerId(req?.query?.sellerTelegramId) ||
    parseSellerId(req?.currentUser?.telegramId)
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
  if (
    ad?.location?.coordinates &&
    Array.isArray(ad.location.coordinates) &&
    ad.location.coordinates.length === 2
  ) {
    const [lng, lat] = ad.location.coordinates;
    return { lat: Number(lat), lng: Number(lng) };
  }

  if (ad?.location?.geo?.coordinates && ad.location.geo.coordinates.length === 2) {
    const [lng, lat] = ad.location.geo.coordinates;
    return {
      lat: Number(lat),
      lng: Number(lng),
    };
  }

  if (ad?.location && ad.location.lat != null && ad.location.lng != null) {
    return {
      lat: Number(ad.location.lat),
      lng: Number(ad.location.lng),
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

    const distanceKm = haversineDistanceKm(
      { lat: latNumber, lng: lngNumber },
      coordinates
    );
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
        key: 'location',
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

router.get(
  '/',
  cacheMiddleware(
    (req) => `${ADS_CACHE_PREFIX}list:${buildCacheKeyFromQuery(req.query)}`,
    ADS_LIST_TTL_SECONDS,
  ),
  async (req, res, next) => {
  try {
    const { filters, sort, page, limit, sortBy } = buildAdQuery(req.query);
    const skip = (page - 1) * limit;

    const latNumber = Number(req.query.lat);
    const lngNumber = Number(req.query.lng);
    const hasGeoQuery = Number.isFinite(latNumber) && Number.isFinite(lngNumber);
    const radiusInput = req.query.radiusKm ?? req.query.maxDistanceKm;
    const radiusNumber = Number(radiusInput);
    const maxDistanceKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 10;

    if (hasGeoQuery) {
      const geoStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          spherical: true,
          query: filters,
          key: 'location',
        },
      };

      if (maxDistanceKm) {
        geoStage.$geoNear.maxDistance = maxDistanceKm * 1000;
      }

      const sortStage =
        sortBy === 'distance' || req.query.sort === 'distance_asc'
          ? { $sort: { distanceMeters: 1 } }
          : { $sort: sort };

      const pipeline = [geoStage, sortStage, {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
          ],
          total: [{ $count: 'count' }],
        },
      }];

      const [result = {}] = await Ad.aggregate(pipeline);
      const total = result.total?.[0]?.count || 0;
      const items = (result.items || []).map((item) => ({
        ...item,
        distanceMeters: item.distanceMeters,
      }));

      return res.json({
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        items,
      });
    }

    const total = await Ad.countDocuments(filters);
    const items = await Ad.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    return res.json({
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const {
      q,
      categoryId,
      subcategoryId,
      priceMin,
      priceMax,
      deliveryType,
      deliveryAvailable,
      buyerLat,
      buyerLng,
      maxDistanceKm,
      seasonCode,
      limit = 20,
      offset = 0,
    } = req.query;

    const baseFilter = {
      status: 'active',
      moderationStatus: 'approved',
    };

    if (categoryId) baseFilter.categoryId = categoryId;
    if (subcategoryId) baseFilter.subcategoryId = subcategoryId;

    const normalizedSeason = normalizeSeasonCode(seasonCode);
    if (normalizedSeason) {
      baseFilter.seasonCode = normalizedSeason;
    }

    const minPrice = Number(priceMin);
    const maxPrice = Number(priceMax);
    if (Number.isFinite(minPrice)) {
      baseFilter.price = { ...(baseFilter.price || {}), $gte: minPrice };
    }
    if (Number.isFinite(maxPrice)) {
      baseFilter.price = { ...(baseFilter.price || {}), $lte: maxPrice };
    }

    if (deliveryType) {
      baseFilter.deliveryType = deliveryType;
    }

    const regex = q ? new RegExp(q, 'i') : null;
    const includeDeliveryDistanceCheck =
      String(deliveryAvailable).toLowerCase() === 'true' || deliveryAvailable === true;

    const limitNumber = Number(limit);
    const offsetNumber = Number(offset);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const latNumber = Number(buyerLat);
    const lngNumber = Number(buyerLng);
    const distanceNumber = Number(maxDistanceKm);
    const hasGeo = Number.isFinite(latNumber) && Number.isFinite(lngNumber);

    if (includeDeliveryDistanceCheck && !hasGeo) {
      return res.status(400).json({ error: 'deliveryAvailable требует координаты buyerLat/buyerLng' });
    }

    const pipeline = [];

    if (hasGeo) {
      const geoStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distance',
          spherical: true,
          query: baseFilter,
          key: 'location',
        },
      };

      if (Number.isFinite(distanceNumber) && distanceNumber > 0) {
        geoStage.$geoNear.maxDistance = distanceNumber * 1000;
      }

      pipeline.push(geoStage);
    } else {
      pipeline.push({ $match: baseFilter });
    }

    pipeline.push({
      $addFields: {
        attributeValues: {
          $map: {
            input: { $objectToArray: { $ifNull: ['$attributes', {}] } },
            as: 'attr',
            in: '$$attr.v',
          },
        },
      },
    });

    const matchClauses = [];

    if (regex) {
      matchClauses.push({
        $or: [
          { title: regex },
          { description: regex },
          { attributeValues: { $elemMatch: { $regex: regex } } },
        ],
      });
    }

    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      const priceMatch = {};
      if (Number.isFinite(minPrice)) priceMatch.$gte = minPrice;
      if (Number.isFinite(maxPrice)) priceMatch.$lte = maxPrice;
      if (Object.keys(priceMatch).length) {
        matchClauses.push({ price: priceMatch });
      }
    }

    if (deliveryType) {
      matchClauses.push({ deliveryType });
    }

    if (includeDeliveryDistanceCheck && hasGeo) {
      matchClauses.push({
        $expr: {
          $and: [
            {
              $in: [
                '$deliveryType',
                ['delivery_only', 'delivery_and_pickup'],
              ],
            },
            {
              $or: [
                { $not: ['$deliveryRadiusKm'] },
                { $gte: ['$deliveryRadiusKm', { $divide: ['$distance', 1000] }] },
              ],
            },
          ],
        },
      });
    }

    if (matchClauses.length) {
      pipeline.push({ $match: { $and: matchClauses } });
    }

    if (hasGeo) {
      pipeline.push({
        $addFields: {
          distanceKm: {
            $cond: [{ $ifNull: ['$distance', false] }, { $divide: ['$distance', 1000] }, null],
          },
        },
      });
    }

    pipeline.push({ $sort: hasGeo ? { distance: 1, createdAt: -1 } : { createdAt: -1 } });

    if (hasGeo) {
      pipeline.push({
        $project: {
          distance: 0,
        },
      });
    }

    pipeline.push({
      $facet: {
        items: [
          { $skip: finalOffset },
          { $limit: finalLimit },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await Ad.aggregate(pipeline);
    const total = (result?.totalCount?.[0]?.count) || 0;
    const items = result?.items || [];

    return res.json({
      items,
      total,
      hasMore: finalOffset + items.length < total,
    });
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
router.get(
  '/nearby',
  cacheMiddleware(
    (req) => `${ADS_CACHE_PREFIX}nearby:${buildCacheKeyFromQuery(req.query)}`,
    ADS_NEARBY_TTL_SECONDS,
  ),
  async (req, res, next) => {
  try {
    const { lat, lng, radiusKm = 10, categoryId, subcategoryId, priceFrom, priceTo } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat и lng обязательны' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ error: 'lat и lng должны быть числами' });
    }

    const radiusNumber = Number(radiusKm);
    const normalizedRadiusKm = Number.isFinite(radiusNumber) ? radiusNumber : 10;
    const finalRadiusKm = Math.min(Math.max(normalizedRadiusKm, 1), 100);
    const radiusMeters = finalRadiusKm * 1000;

    const filter = {
      status: 'active',
      moderationStatus: 'approved',
    };

    const andConditions = [];

    const categoryFilter = categoryId || req.query.category;
    if (categoryFilter) {
      andConditions.push({ $or: [{ categoryId: categoryFilter }, { category: categoryFilter }] });
    }

    const subcategoryFilter = subcategoryId || req.query.subcategory;
    if (subcategoryFilter) {
      andConditions.push({ $or: [{ subcategoryId: subcategoryFilter }, { subcategory: subcategoryFilter }] });
    }

    if (priceFrom || priceTo) {
      const priceFilter = {};
      if (priceFrom && Number.isFinite(Number(priceFrom))) {
        priceFilter.$gte = Number(priceFrom);
      }
      if (priceTo && Number.isFinite(Number(priceTo))) {
        priceFilter.$lte = Number(priceTo);
      }
      if (Object.keys(priceFilter).length) {
        andConditions.push({ price: priceFilter });
      }
    }

    const finalFilter = andConditions.length ? { ...filter, $and: andConditions } : filter;

    const ads = await Ad.find({
      ...finalFilter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lngNumber, latNumber] },
          $maxDistance: radiusMeters,
        },
      },
    })
      .limit(100)
      .select('title price photos images location categoryId category subcategoryId subcategory status');

    return res.json(Array.isArray(ads) ? ads : []);
  } catch (error) {
    next(error);
  }
});

router.get('/my', auth, async (req, res, next) => {
  try {
    const telegramId = req.currentUser.telegramId;

    if (!telegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ads = await Ad.find({ sellerTelegramId: telegramId }).sort({ createdAt: -1 });

    return res.json(ads);
  } catch (error) {
    next(error);
  }
});

// GET /api/ads/live-spots — geo search for live locations
router.get('/live-spots', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5, seasonCode, categoryId, subcategoryId, limit = 200 } =
      req.query;

    const filter = {
      isLiveSpot: true,
      status: 'active',
      moderationStatus: 'approved',
    };

    if (seasonCode) filter.seasonCode = normalizeSeasonCode(seasonCode);
    if (categoryId) filter.categoryId = categoryId;
    if (subcategoryId) filter.subcategoryId = subcategoryId;

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 200) : 50;

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);

    const hasGeo = Number.isFinite(latNumber) && Number.isFinite(lngNumber);

    if (hasGeo) {
      const geoStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          spherical: true,
          key: 'location',
          query: filter,
        },
      };

      if (Number.isFinite(radiusNumber) && radiusNumber > 0) {
        geoStage.$geoNear.maxDistance = radiusNumber * 1000;
      }

      const items = await Ad.aggregate([
        geoStage,
        { $sort: { distanceMeters: 1 } },
        { $limit: finalLimit },
      ]);

      return res.json({ items });
    }

    const items = await Ad.find(filter)
      .sort({ createdAt: -1 })
      .limit(finalLimit);

    return res.json({ items });
  } catch (error) {
    console.error('GET /api/ads/live-spots error:', error);
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
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.patch('/:id/price', auth, async (req, res, next) => {
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
    const updatedAd = await updateAdPrice(ad._id, newPrice);

    return res.json({ item: updatedAd });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.patch('/:id/photos', auth, async (req, res, next) => {
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

router.post('/:id/extend', auth, async (req, res, next) => {
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

router.post('/:id/liveSpot/on', auth, async (req, res, next) => {
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

router.post('/:id/liveSpot/off', auth, async (req, res, next) => {
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

router.post('/bulk/update-status', auth, async (req, res) => {
  try {
    const { adIds, status } = req.body || {};
    const allowedStatuses = new Set(['active', 'hidden', 'archived']);

    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ error: 'adIds must be a non-empty array' });
    }

    if (typeof status !== 'string' || !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const ads = await Ad.find({ _id: { $in: adIds } });
    let updated = 0;

    for (const ad of ads) {
      await updateAdStatus(ad._id, status);
      updated += 1;
    }

    console.log(`[BULK UPDATE] update-status — ${updated} ads updated`);

    return res.json({ updated, status });
  } catch (error) {
    console.error('POST /api/ads/bulk/update-status error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk/extend', auth, async (req, res) => {
  try {
    const { adIds, extendDays, sellerTelegramId } = req.body || {};

    if (!Array.isArray(adIds) || adIds.length === 0) {
      return res.status(400).json({ error: 'adIds must be a non-empty array' });
    }

    const extendNumber = Number(extendDays);
    if (!Number.isFinite(extendNumber) || extendNumber <= 0) {
      return res.status(400).json({ error: 'extendDays must be a positive number' });
    }

    const sellerId = parseSellerId(sellerTelegramId);
    if (!sellerId) {
      return res.status(400).json({ error: 'sellerTelegramId is required' });
    }

    const ads = await Ad.find({ _id: { $in: adIds }, sellerTelegramId: sellerId });
    let updated = 0;

    for (const ad of ads) {
      const now = new Date();
      const base = ad.validUntil && ad.validUntil > now ? new Date(ad.validUntil) : now;
      base.setDate(base.getDate() + extendNumber);
      ad.validUntil = base;
      ad.lifetimeDays = extendNumber;
      await ad.save();
      updated += 1;
    }

    console.log(`[BULK UPDATE] extend — ${updated} ads updated`);
    return res.json({ updated, extendDays: extendNumber });
  } catch (error) {
    console.error('POST /api/ads/bulk/extend error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk/hide-expired', auth, async (req, res) => {
  try {
    const now = new Date();
    const expiringAds = await Ad.find({ status: 'active', validUntil: { $lt: now } });
    let updated = 0;

    for (const ad of expiringAds) {
      await updateAdStatus(ad._id, 'expired');
      updated += 1;
    }

    console.log(`[BULK UPDATE] hide-expired — ${updated} ads updated`);

    return res.json({ updated, status: 'expired' });
  } catch (error) {
    console.error('POST /api/ads/bulk/hide-expired error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/hide', auth, async (req, res, next) => {
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

    let nextStatus = ad.status;
    if (hidden === false) {
      if (ad.status === 'hidden') {
        nextStatus = 'active';
      }
    } else {
      nextStatus = 'hidden';
    }

    const updatedAd = await updateAdStatus(ad._id, nextStatus);
    if (nextStatus === 'hidden') {
      updatedAd.isLiveSpot = false;
      await updatedAd.save();
    }

    return res.json({ item: updatedAd, hidden: updatedAd.status === 'hidden' });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
});

router.post('/:id/debug-notify-favorites', requireInternalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPrice, oldStatus } = req.body || {};

    const adAfter = await Ad.findById(id);
    if (!adAfter) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const adBefore = {
      _id: adAfter._id,
      price: oldPrice != null ? Number(oldPrice) : adAfter.price,
      status: oldStatus || adAfter.status,
    };

    const notifications = await findUsersToNotifyOnAdChange(adBefore, adAfter.toObject());
    await sendPriceStatusChangeNotifications(notifications);

    return res.json({ notifications });
  } catch (error) {
    console.error('debug-notify-favorites error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get(
  '/:id',
  cacheMiddleware(
    (req) => `${ADS_CACHE_PREFIX}details:${req.params.id}`,
    ADS_DETAILS_TTL_SECONDS,
  ),
  async (req, res, next) => {
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

router.post('/', auth, validate(adCreateSchema), validateCreateAd, async (req, res, next) => {
  try {
    const payload = req.validatedAdPayload;

    if (!payload) {
      return res.status(400).json({ error: 'Некорректные данные объявления' });
    }

    const ad = await Ad.create(payload);
    res.status(201).json(ad);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать sellerTelegramId для обновления объявления' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);

    const incomingImages = Array.isArray(req.body.images)
      ? req.body.images
      : Array.isArray(req.body.photos)
        ? req.body.photos
        : null;

    const normalizedImages = Array.isArray(incomingImages)
      ? incomingImages
          .filter((url) => typeof url === 'string' && url.trim())
          .map((url) => url.trim())
      : null;

    if (normalizedImages) {
      ad.images = normalizedImages;
      ad.photos = normalizedImages;
    }

    const allowedScalarFields = [
      'title',
      'description',
      'price',
      'currency',
      'category',
      'subcategory',
      'categoryId',
      'subcategoryId',
      'seasonCode',
    ];

    for (const field of allowedScalarFields) {
      if (req.body[field] != null) {
        ad[field] = req.body[field];
      }
    }

    if (req.body.attributes && typeof req.body.attributes === 'object') {
      ad.attributes = req.body.attributes;
    }

    if (req.body.location && typeof req.body.location === 'object') {
      ad.location = {
        ...ad.location,
        lat: req.body.location.lat ?? ad.location?.lat,
        lng: req.body.location.lng ?? ad.location?.lng,
      };
    }

    await ad.save();
    res.json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/live-spot', auth, async (req, res, next) => {
  try {
    const sellerId = getSellerIdFromRequest(req);

    if (!sellerId) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать корректный sellerTelegramId для проверки прав' });
    }

    const ad = await findAdOwnedBySeller(req.params.id, sellerId);

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

    try {
      const notifications = await findUsersToNotifyOnAdChange(before, after);
      if (notifications.length) {
        await sendPriceStatusChangeNotifications(notifications);
      }
    } catch (notifyError) {
      console.error('Favorites notification calculation error:', notifyError);
    }

    try {
      const notifications = await findUsersToNotifyOnAdChange(before, after);
      if (notifications.length) {
        await sendPriceStatusChangeNotifications(notifications);
      }
    } catch (notifyError) {
      console.error('Favorites notification calculation error:', notifyError);
    }

    ad.isLiveSpot = isLiveSpot;
    await ad.save();

    res.json(ad);
  } catch (error) {
    console.error('PATCH /api/ads/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/live-spot', auth, async (req, res, next) => {
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

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const ad = await updateAdStatus(id, 'archived');

    res.json({ message: 'Объявление архивировано', ad });
  } catch (error) {
    if (error.message === 'Ad not found') {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }
    next(error);
  }
});

// PATCH /api/ads/:id/status — обновление статуса объявления
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, moderationStatus, comment } = req.body || {};

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const adBefore = ad.toObject();
    let updatedAd = ad;

    if (status) {
      updatedAd = await updateAdStatus(ad._id, status);
    }

    if (moderationStatus) {
      updatedAd.moderationStatus = moderationStatus;
      if (moderationStatus === 'rejected' && comment) {
        updatedAd.moderationComment = comment;
      }
      await updatedAd.save();
    }

    const adAfter = updatedAd.toObject();

    try {
      const notifications = await findUsersToNotifyOnAdChange(adBefore, adAfter);
      if (notifications.length) {
        await sendPriceStatusChangeNotifications(notifications);
      }
    } catch (notifyError) {
      console.error('Favorites notification calculation error (status):', notifyError);
    }

    return res.json({
      message: 'Статус обновлён',
      ad: updatedAd,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Ошибка при обновлении статуса', details: error.message });
  }
});

module.exports = router;
