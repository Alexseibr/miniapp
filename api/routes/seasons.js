const { Router } = require('express');
const Season = require('../../models/Season.js');
const Ad = require('../../models/Ad.js');

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const seasons = await Season.find().sort({ startDate: -1 });
    res.json(seasons);
  } catch (error) {
    next(error);
  }
});

router.get('/active', async (_req, res, next) => {
  try {
    const now = new Date();
    const seasons = await Season.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ startDate: -1 });
    res.json(seasons);
  } catch (error) {
    next(error);
  }
});

router.get('/:code/ads', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { limit = 20, offset = 0, sort = 'newest' } = req.query;

    const seasonCode = String(code).toLowerCase();
    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    let sortObj = { createdAt: -1 };
    if (sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    const items = await Ad.find({ seasonCode, status: 'active' })
      .sort(sortObj)
      .skip(finalOffset)
      .limit(finalLimit);

    res.json({ items });
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
    const maxDistance = finalRadiusKm * 1000;

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const seasonCode = String(code).toLowerCase();

    const ads = await Ad.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          maxDistance,
          spherical: true,
          query: {
            seasonCode,
            status: 'active',
            isLiveSpot: true,
          },
        },
      },
      { $sort: { distanceMeters: 1, createdAt: -1 } },
      { $limit: finalLimit },
    ]);

    return res.json({
      items: ads.map((ad) => ({
        ...ad,
        distanceKm: typeof ad.distanceMeters === 'number' ? ad.distanceMeters / 1000 : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
