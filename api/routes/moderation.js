const express = require('express');
const Ad = require('../../models/Ad');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

router.use(adminAuth);

router.get('/ads/pending', async (req, res, next) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

    const [items, total] = await Promise.all([
      Ad.find({ moderationStatus: 'pending' })
        .sort({ createdAt: 1 })
        .skip(offset)
        .limit(limit)
        .select(
          'title categoryId subcategoryId price sellerTelegramId createdAt moderationStatus'
        ),
      Ad.countDocuments({ moderationStatus: 'pending' }),
    ]);

    return res.json({ items, total, limit, offset });
  } catch (error) {
    next(error);
  }
});

router.get('/ads/:id', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/ads/:id/approve', async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';

    ad.moderationStatus = 'approved';
    ad.moderation = {
      lastActionBy: req.admin?.id,
      lastActionAt: new Date(),
      lastReason: reason,
    };

    await ad.save();

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/ads/:id/reject', async (req, res, next) => {
  try {
    const reason = (req.body?.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ message: 'Поле reason обязательно' });
    }

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    ad.moderationStatus = 'rejected';
    ad.status = 'hidden';
    ad.moderation = {
      lastActionBy: req.admin?.id,
      lastActionAt: new Date(),
      lastReason: reason,
    };

    await ad.save();

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
