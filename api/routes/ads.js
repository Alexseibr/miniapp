const { Router } = require('express');
const Ad = require('../../models/Ad.js');

const router = Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.get(
  '/',
  handle(async (req, res) => {
    const {
      limit = 20,
      offset = 0,
      categoryId,
      subcategoryId,
      seasonCode,
      q,
      minPrice,
      maxPrice,
    } = req.query;

    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const parsedOffset = Math.max(Number(offset) || 0, 0);
    const filters = { status: 'active' };

    if (categoryId) filters.categoryId = categoryId;
    if (subcategoryId) filters.subcategoryId = subcategoryId;
    if (seasonCode) filters.seasonCode = seasonCode;

    const queryText = typeof q === 'string' ? q.trim() : '';
    if (queryText) {
      const regex = new RegExp(queryText, 'i');
      filters.$or = [{ title: regex }, { description: regex }];
    }

    const priceFilter = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (Number.isFinite(min)) {
      priceFilter.$gte = min;
    }
    if (Number.isFinite(max)) {
      priceFilter.$lte = max;
    }
    if (Object.keys(priceFilter).length) {
      filters.price = priceFilter;
    }

    const items = await Ad.find(filters)
      .sort({ createdAt: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit);

    res.json({ items });
  })
);

router.get(
  '/:id',
  handle(async (req, res) => {
    const ad = await Ad.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }
    res.json(ad);
  })
);

router.post(
  '/',
  handle(async (req, res) => {
    const { title, categoryId, subcategoryId, price, sellerTelegramId } = req.body;

    if (!title || !categoryId || !subcategoryId || price === undefined || !sellerTelegramId) {
      return res.status(400).json({
        message: 'Необходимо указать title, categoryId, subcategoryId, price и sellerTelegramId',
      });
    }

    const ad = await Ad.create(req.body);
    res.status(201).json(ad);
  })
);

module.exports = router;
