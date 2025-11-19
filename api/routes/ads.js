const { Router } = require('express');
const Ad = require('../../models/Ad.js');

const router = Router();

// Геопоиск:
// GET /api/ads?lat=52.1&lng=23.7&radiusKm=2
// GET /api/ads?lat=52.1&lng=23.7&radiusKm=50&categoryId=country_base
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
      radiusKm = 5,
    } = req.query;

    const query = { status: 'active' };

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;
    if (seasonCode) query.seasonCode = seasonCode;

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
            query,
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
          typeof item.distanceMeters === 'number'
            ? item.distanceMeters / 1000
            : null,
      }));

      return res.json({ items });
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    const items = await Ad.find(query)
      .sort(sortObj)
      .skip(finalOffset)
      .limit(finalLimit);

    res.json({ items });
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
    } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat и lng обязательны' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ error: 'lat и lng должны быть числами' });
    }

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;
    const maxDistance = finalRadiusKm * 1000;

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const geoQuery = { status: 'active' };
    if (categoryId) geoQuery.categoryId = categoryId;
    if (subcategoryId) geoQuery.subcategoryId = subcategoryId;

    const ads = await Ad.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          maxDistance,
          spherical: true,
          query: geoQuery,
        },
      },
      { $sort: { distanceMeters: 1, createdAt: -1 } },
      { $limit: finalLimit },
    ]);

    return res.json({
      items: ads.map((ad) => ({
        ...ad,
        distanceKm:
          typeof ad.distanceMeters === 'number' ? ad.distanceMeters / 1000 : null,
      })),
    });
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

    const ad = await Ad.create({
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
      status: 'active',
    });

    res.status(201).json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/live-spot', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sellerTelegramId, isLiveSpot } = req.body;

    if (typeof isLiveSpot !== 'boolean') {
      return res.status(400).json({ message: 'isLiveSpot должен быть true/false' });
    }

    if (sellerTelegramId === undefined) {
      return res.status(400).json({ message: 'Необходимо указать sellerTelegramId' });
    }

    const sellerIdNumber = Number(sellerTelegramId);
    if (!Number.isFinite(sellerIdNumber)) {
      return res.status(400).json({ message: 'sellerTelegramId должен быть числом' });
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    if (ad.sellerTelegramId !== sellerIdNumber) {
      return res.status(403).json({ message: 'Можно менять только свои объявления' });
    }

    ad.isLiveSpot = isLiveSpot;
    await ad.save();

    return res.json({ ok: true, ad });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'title',
      'description',
      'price',
      'currency',
      'photos',
      'attributes',
      'seasonCode',
      'status',
      'deliveryOptions',
      'isLiveSpot',
      'location',
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    const ad = await Ad.findByIdAndUpdate(id, filteredUpdates, {
      new: true,
      runValidators: true,
    });

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    res.json(ad);
  } catch (error) {
    next(error);
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
