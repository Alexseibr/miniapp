const { Router } = require('express');
const Season = require('../../models/Season.js');

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const seasons = await Season.find();
    res.json(seasons);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
