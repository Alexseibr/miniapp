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

    const normalizedCode = (code || '').toLowerCase();
    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    let sortObj = { createdAt: -1 };
    if (sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    const items = await Ad.find({
      status: 'active',
      seasonCode: normalizedCode,
    })
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
    const {
      lat,
      lng,
      radiusKm = 5,
      limit = 20,
      offset = 0,
    } = req.query;

    const normalizedCode = (code || '').toLowerCase();
    const baseQuery = {
      status: 'active',
      seasonCode: normalizedCode,
      isLiveSpot: true,
    };

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;
    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const hasGeoQuery = Number.isFinite(latNumber) && Number.isFinite(lngNumber);

    if (hasGeoQuery) {
      const radiusNumber = Number(radiusKm);
      const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;
      const maxDistance = finalRadiusKm * 1000;

      const pipeline = [
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [lngNumber, latNumber] },
            distanceField: 'distanceMeters',
            maxDistance,
            spherical: true,
            query: baseQuery,
          },
        },
        { $sort: { distanceMeters: 1, createdAt: -1 } },
      ];

      if (finalOffset > 0) {
        pipeline.push({ $skip: finalOffset });
      }

      pipeline.push({ $limit: finalLimit });

      const geoItems = await Ad.aggregate(pipeline);
      const items = geoItems.map((item) => ({
        ...item,
        distanceKm:
          typeof item.distanceMeters === 'number' ? item.distanceMeters / 1000 : null,
      }));

      return res.json({ items });
    }

    const items = await Ad.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(finalOffset)
      .limit(finalLimit);

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
