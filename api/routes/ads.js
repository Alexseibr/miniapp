const { Router } = require('express');
const Ad = require('../../models/Ad.js');
const { getDistanceKm } = require('../../utils/distance');

const router = Router();

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
      const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : null;

      const geoQuery = {
        ...query,
        'location.lat': { $ne: null },
        'location.lng': { $ne: null },
      };

      const ads = await Ad.find(geoQuery);
      const itemsWithDistance = [];

      for (const ad of ads) {
        if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
          continue;
        }

        const distanceKm = getDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);

        if (distanceKm == null) {
          continue;
        }

        if (finalRadiusKm && distanceKm > finalRadiusKm) {
          continue;
        }

        const adObject = ad.toObject();
        adObject.distanceKm = distanceKm;
        itemsWithDistance.push(adObject);
      }

      const sortedItems = itemsWithDistance.slice();

      if (sort === 'distance') {
        sortedItems.sort((a, b) => a.distanceKm - b.distanceKm);
      } else if (sort === 'cheapest') {
        sortedItems.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else {
        sortedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const pagedItems = sortedItems.slice(finalOffset, finalOffset + finalLimit);

      return res.json({ items: pagedItems });
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
router.get('/nearby', async (req, res, next) => {
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

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : null;

    const query = {
      status: 'active',
      'location.lat': { $ne: null },
      'location.lng': { $ne: null },
    };

    if (categoryId) query.categoryId = categoryId;
    if (subcategoryId) query.subcategoryId = subcategoryId;

    const ads = await Ad.find(query);
    const itemsWithDistance = [];

    for (const ad of ads) {
      if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
        continue;
      }

      const distanceKm = getDistanceKm(latNumber, lngNumber, ad.location.lat, ad.location.lng);

      if (distanceKm == null) {
        continue;
      }

      if (finalRadiusKm && distanceKm > finalRadiusKm) {
        continue;
      }

      const adObject = ad.toObject();
      adObject.distanceKm = distanceKm;
      itemsWithDistance.push(adObject);
    }

    itemsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({ items: itemsWithDistance.slice(0, finalLimit) });
  } catch (error) {
    next(error);
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
