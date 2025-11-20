const { Router } = require('express');
const Category = require('../../models/Category.js');
const asyncHandler = require('../middleware/asyncHandler.js');

const router = Router();

const defaultCategories = [
  {
    code: 'electronics',
    name: 'Электроника',
    subcategories: [
      { code: 'phones', name: 'Телефоны' },
      { code: 'laptops', name: 'Ноутбуки' },
      { code: 'tvs', name: 'Телевизоры' },
    ],
  },
  {
    code: 'auto',
    name: 'Авто',
    subcategories: [
      { code: 'cars', name: 'Легковые' },
      { code: 'moto', name: 'Мото' },
      { code: 'tires', name: 'Шины и диски' },
    ],
  },
];

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find().sort({ code: 1 });
    res.json(categories);
  }),
);

router.post(
  '/seed',
  asyncHandler(async (req, res) => {
    const categories = Array.isArray(req.body?.categories) && req.body.categories.length
      ? req.body.categories
      : defaultCategories;

    await Category.deleteMany({});
    const created = await Category.insertMany(categories);

    res.json({ inserted: created.length });
  }),
);

module.exports = router;
