const { Router } = require('express');
const Ad = require('../../models/Ad.js');

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

    let sortObj = { createdAt: -1 };
    if (sort === 'cheapest') {
      sortObj = { price: 1 };
    }

    const limitNumber = Number(limit);
    const finalLimit = Number.isFinite(limitNumber) && limitNumber > 0 ? Math.min(limitNumber, 100) : 20;

    const offsetNumber = Number(offset);
    const finalOffset = Number.isFinite(offsetNumber) && offsetNumber >= 0 ? offsetNumber : 0;

    const items = await Ad.find(query)
      .sort(sortObj)
      .skip(finalOffset)
      .limit(finalLimit);

    res.json({ items });
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
