const express = require('express');
const Ad = require('../../models/Ad');

const router = express.Router();

function parsePagination(query = {}) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

router.get('/pending-ads', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const [items, total] = await Promise.all([
      Ad.find({ moderationStatus: 'pending' })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Ad.countDocuments({ moderationStatus: 'pending' }),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/ad/:id', async (req, res, next) => {
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

router.post('/ad/:id/approve', async (req, res, next) => {
  try {
    const moderator = (req.body?.moderator || '').trim();

    if (!moderator) {
      return res.status(400).json({ message: 'Поле moderator обязательно' });
    }

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    ad.moderationStatus = 'approved';
    ad.moderationComment = null;
    ad.moderatedAt = new Date();
    ad.moderatedBy = moderator;

    await ad.save();

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

router.post('/ad/:id/reject', async (req, res, next) => {
  try {
    const moderator = (req.body?.moderator || '').trim();
    const comment = (req.body?.comment || '').trim();

    if (!moderator || !comment) {
      return res.status(400).json({ message: 'moderator и comment обязательны' });
    }

    const ad = await Ad.findById(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    ad.moderationStatus = 'rejected';
    ad.moderationComment = comment;
    ad.moderatedAt = new Date();
    ad.moderatedBy = moderator;

    await ad.save();

    return res.json(ad);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
