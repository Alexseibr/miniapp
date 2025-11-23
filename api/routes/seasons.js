import { Router } from 'express';
import Season from '../../models/Season.js';
import Ad from '../../models/Ad.js';
import { haversineDistanceKm } from '../../utils/distance.js';
import asyncHandler from '../middleware/asyncHandler.js';

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
      page = 1,
      categoryId,
      subcategoryId,
      lat,
      lng,
      radiusKm,
    } = req.query;

    const seasonCode = String(code).toLowerCase();
    const season = await Season.findOne({ code: seasonCode });

    if (!season) {
      return res.status(404).json({ message: 'Сезон не найден' });
    }

    const limitNumber = Number(limit);
    const finalLimit =
      Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const pageNumber = Number(page);
    const finalPage = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const skip = (finalPage - 1) * finalLimit;

    const baseFilter = {
      seasonCode,
      status: 'active',
      moderationStatus: 'approved',
    };

    if (categoryId) baseFilter.categoryId = categoryId;
    if (subcategoryId) baseFilter.subcategoryId = subcategoryId;

    const radiusNumber = Number(radiusKm || season.defaultRadiusKm);
    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const hasGeo =
      season.isGeoFocused && Number.isFinite(latNumber) && Number.isFinite(lngNumber);

    if (hasGeo) {
      const geoStage = {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          spherical: true,
          key: 'geo',
          query: baseFilter,
        },
      };

      if (Number.isFinite(radiusNumber) && radiusNumber > 0) {
        geoStage.$geoNear.maxDistance = radiusNumber * 1000;
      }

      const pipeline = [
        geoStage,
        { $sort: { distanceMeters: 1, createdAt: -1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: finalLimit }],
            total: [{ $count: 'count' }],
          },
        },
      ];

      const [result = {}] = await Ad.aggregate(pipeline);
      const total = result.total?.[0]?.count || 0;
      const items = (result.items || []).map((item) => ({
        ...item,
        distanceMeters: item.distanceMeters,
      }));

      return res.json({
        season,
        items,
        page: finalPage,
        limit: finalLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / finalLimit),
      });
    }

    const [items, total] = await Promise.all([
      Ad.find(baseFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(finalLimit),
      Ad.countDocuments(baseFilter),
    ]);

    return res.json({
      season,
      items,
      page: finalPage,
      limit: finalLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / finalLimit),
    });
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

    const ads = await Ad.find({
      seasonCode,
      status: 'active',
      isLiveSpot: true,
      moderationStatus: 'approved',
    })
      .sort({ createdAt: -1 })
      .limit(fetchLimit);

    const mapped = [];
    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = haversineDistanceKm(
        { lat: latNumber, lng: lngNumber },
        { lat: ad.location.lat, lng: ad.location.lng }
      );
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

export default router;
