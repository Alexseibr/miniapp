const { Router } = require('express');
const Ad = require('../../models/Ad.js');
const { haversineDistanceKm } = require('../../utils/distance');
const { notifyFavoritesOnAdChange } = require('../../services/notifications');

const router = Router();

const SEASON_SHORT_LIFETIME = {
  march8_tulips: 3,
};

function normalizeSeasonCode(code) {
  if (typeof code !== 'string') {
    return undefined;
  }

  return code.trim().toLowerCase();
}

function projectAdsWithinRadius(ads, { latNumber, lngNumber, radiusKm }) {
  const radiusLimit = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : null;
  const projected = [];

  for (const ad of ads) {
    if (!ad?.location || ad.location.lat == null || ad.location.lng == null) {
      continue;
    }

    const distanceKm = haversineDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);
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

    const query = { status: 'active' };

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

// GET /api/ads/nearby
router.get('/nearby', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radiusKm = 5,
      categoryId,
      subcategoryId,
      limit = 20,
      offset = 0,
      seasonCode,
    } = req.query;

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
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const baseQuery = { status: 'active' };
    if (categoryId) baseQuery.categoryId = categoryId;
    if (subcategoryId) baseQuery.subcategoryId = subcategoryId;
    const normalizedSeason = normalizeSeasonCode(seasonCode);
    if (normalizedSeason) baseQuery.seasonCode = normalizedSeason;

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);
    const ads = await Ad.find(baseQuery)
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
      const items = await Ad.find({ seasonCode, status: 'active' })
        .sort(sortObj)
        .skip(finalOffset)
        .limit(finalLimit);

      return res.json({ items });
    }

    const baseAds = await Ad.find({ seasonCode, status: 'active' })
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

    const items = filterAdsByGeo(ads, {
      latNumber,
      lngNumber,
      radiusKm: finalRadiusKm,
      offset: finalOffset,
      limit: finalLimit,
      sortByDistance: true,
    });

    return res.json({ items });
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

    notifyFavoritesOnAdChange(before, ad.toObject());

    res.json(ad);
  } catch (error) {
    console.error('PATCH /api/ads/:id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/live-spot', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLiveSpot, sellerTelegramId } = req.body || {};

    if (typeof isLiveSpot !== 'boolean') {
      return res.status(400).json({ message: 'Поле isLiveSpot обязательно и должно быть boolean' });
    }

    const sellerIdNumber = Number(sellerTelegramId);
    if (!Number.isFinite(sellerIdNumber)) {
      return res
        .status(400)
        .json({ message: 'Необходимо указать корректный sellerTelegramId для проверки прав' });
    }

    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    if (ad.sellerTelegramId !== sellerIdNumber) {
      return res.status(403).json({ message: 'Вы не можете изменять live-spot для этого объявления' });
    }

    ad.isLiveSpot = isLiveSpot;
    await ad.save();

    res.json(ad);
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
