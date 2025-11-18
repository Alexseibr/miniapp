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
    const { limit = 20, categoryId, subcategoryId, seasonCode } = req.query;
    const filters = { status: 'active' };

    if (categoryId) filters.categoryId = categoryId;
    if (subcategoryId) filters.subcategoryId = subcategoryId;
    if (seasonCode) filters.seasonCode = seasonCode;

    const items = await Ad.find(filters)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 100));

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
