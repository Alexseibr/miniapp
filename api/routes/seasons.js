const { Router } = require('express');
const Season = require('../../models/Season.js');
const Ad = require('../../models/Ad.js');
const { haversineDistanceKm } = require('../../utils/distance');
const asyncHandler = require('../middleware/asyncHandler.js');

const router = Router();

const TULIP_SUBCATEGORIES = ['flowers', 'flowers_tulips', 'tulips_single', 'tulips_bouquets'];
const CRAFT_SUBCATEGORIES = ['craft', 'cakes', 'eclairs', 'bakery'];
const FARM_SUBCATEGORIES = ['farm', 'berries', 'vegetables', 'fruits'];

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const seasons = await Season.find().sort({ startDate: -1 });
    res.json(seasons);
  })
);

router.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const seasons = await Season.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });
    res.json(seasons);
  })
);

router.get(
  '/:code/ads',
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const {
      limit = 20,
      offset = 0,
      sort = 'newest',
      live,
      lat,
      lng,
      radiusKm = 5,
    } = req.query;

    const seasonCode = String(code).toLowerCase();
    const season = await Season.findOne({ code: seasonCode });

    if (!season) {
      return res.status(404).json({ message: 'Сезон не найден' });
    }

    const limitNumber = Number(limit);
    const finalLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const query = { seasonCode, status: 'active', moderationStatus: 'approved' };
    const filters = season.specialFilters || {};
    const orConditions = [];

    if (filters.enableTulips) {
      orConditions.push({ subcategoryId: { $in: TULIP_SUBCATEGORIES } });
    }

    if (filters.enableCraft) {
      orConditions.push({ subcategoryId: { $in: CRAFT_SUBCATEGORIES } });
    }

    if (filters.enableFarm) {
      orConditions.push({ subcategoryId: { $in: FARM_SUBCATEGORIES } });
      orConditions.push({ categoryId: { $in: FARM_SUBCATEGORIES } });
    }

    if (orConditions.length === 1) {
      Object.assign(query, orConditions[0]);
    } else if (orConditions.length > 1) {
      query.$or = orConditions;
    }

    const liveOnly = live === '1' || live === 'true';
    if (liveOnly) {
      query.isLiveSpot = true;
      query['location.lat'] = { $ne: null };
      query['location.lng'] = { $ne: null };
    }

    const sortObj = sort === 'cheapest' ? { price: 1 } : { createdAt: -1 };
    const fetchLimit = liveOnly ? Math.max(finalLimit * 3, finalLimit) : finalLimit;

    const ads = await Ad.find(query)
      .sort(sortObj)
      .skip(finalOffset)
      .limit(fetchLimit);

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);
    const hasGeo =
      liveOnly &&
      Number.isFinite(latNumber) &&
      Number.isFinite(lngNumber) &&
      Number.isFinite(radiusNumber) &&
      radiusNumber > 0;

    if (!hasGeo) {
      return res.json({ items: ads });
    }

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = haversineDistanceKm(
        latNumber,
        lngNumber,
        ad.location.lat,
        ad.location.lng
      );

      if (distanceKm == null || distanceKm > radiusNumber) {
        continue;
      }

      const plain = ad.toObject({ getters: true, virtuals: false });
      plain.distanceKm = Number(distanceKm.toFixed(2));
      mapped.push(plain);
    }

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: mapped.slice(0, finalLimit) });
  })
);

router.get(
  '/:code/live-spots',
  asyncHandler(async (req, res) => {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для поиска живых точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const seasonCode = typeof code === 'string' ? code.toLowerCase() : null;
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = haversineDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);
      if (distanceKm == null || distanceKm > finalRadiusKm) {
        continue;
      }

      const obj = ad.toObject({ getters: true, virtuals: false });
      obj.distanceKm = Number(distanceKm.toFixed(2));
      mapped.push(obj);
    }

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: mapped.slice(0, finalLimit) });
  })
);

router.get('/:code/ads', async (req, res, next) => {
  try {
    const { code } = req.params;
    const {
      limit = 20,
      offset = 0,
      sort = 'newest',
      live,
      lat,
      lng,
      radiusKm = 5,
    } = req.query;

    const seasonCode = String(code).toLowerCase();
    const season = await Season.findOne({ code: seasonCode });

    if (!season) {
      return res.status(404).json({ message: 'Сезон не найден' });
    }

    const limitNumber = Number(limit);
    const finalLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const query = { seasonCode, status: 'active', moderationStatus: 'approved' };
    const filters = season.specialFilters || {};
    const orConditions = [];

    if (filters.enableTulips) {
      orConditions.push({ subcategoryId: { $in: TULIP_SUBCATEGORIES } });
    }

    if (filters.enableCraft) {
      orConditions.push({ subcategoryId: { $in: CRAFT_SUBCATEGORIES } });
    }

    if (filters.enableFarm) {
      orConditions.push({ subcategoryId: { $in: FARM_SUBCATEGORIES } });
      orConditions.push({ categoryId: { $in: FARM_SUBCATEGORIES } });
    }

    if (orConditions.length === 1) {
      Object.assign(query, orConditions[0]);
    } else if (orConditions.length > 1) {
      query.$or = orConditions;
    }

    const liveOnly = live === '1' || live === 'true';
    if (liveOnly) {
      query.isLiveSpot = true;
      query['location.lat'] = { $ne: null };
      query['location.lng'] = { $ne: null };
    }

    const sortObj = sort === 'cheapest' ? { price: 1 } : { createdAt: -1 };
    const fetchLimit = liveOnly ? Math.max(finalLimit * 3, finalLimit) : finalLimit;

    const ads = await Ad.find(query)
      .sort(sortObj)
      .skip(finalOffset)
      .limit(fetchLimit);

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);
    const hasGeo =
      liveOnly &&
      Number.isFinite(latNumber) &&
      Number.isFinite(lngNumber) &&
      Number.isFinite(radiusNumber) &&
      radiusNumber > 0;

    if (!hasGeo) {
      return res.json({ items: ads });
    }

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = haversineDistanceKm(
        latNumber,
        lngNumber,
        ad.location.lat,
        ad.location.lng
      );

      if (distanceKm == null || distanceKm > radiusNumber) {
        continue;
      }

      const plain = ad.toObject({ getters: true, virtuals: false });
      plain.distanceKm = Number(distanceKm.toFixed(2));
      mapped.push(plain);
    }

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: mapped.slice(0, finalLimit) });
  } catch (error) {
    next(error);
  }
});

router.get('/:code/live-spots', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { lat, lng, radiusKm = 5, limit = 20 } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat и lng обязательны для поиска живых точек' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat и lng должны быть числами' });
    }

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const seasonCode = typeof code === 'string' ? code.toLowerCase() : null;
    if (!seasonCode) {
      return res.status(400).json({ message: 'Некорректный код сезона' });
    }

    const fetchLimit = Math.max(finalLimit * 3, finalLimit);

    const ads = await Ad.find({ seasonCode, status: 'active', isLiveSpot: true })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = haversineDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);
      if (distanceKm == null || distanceKm > finalRadiusKm) {
        continue;
      }

      const obj = ad.toObject({ getters: true, virtuals: false });
      obj.distanceKm = Number(distanceKm.toFixed(2));
      mapped.push(obj);
    }

    mapped.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: mapped.slice(0, finalLimit) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
