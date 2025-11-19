const { Router } = require('express');
const User = require('../../models/User');
const Ad = require('../../models/Ad');

const router = Router();

const parseTelegramId = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return num;
};

router.get('/', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.query.telegramId);

    if (telegramId === null) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    const user = await User.findOne({ telegramId }).populate('favorites');

    return res.json({
      ok: true,
      items: user?.favorites || [],
    });
  } catch (error) {
    console.error('Failed to load favorites', error);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { telegramId: rawTelegramId, adId } = req.body || {};
    const telegramId = parseTelegramId(rawTelegramId);

    if (telegramId === null || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    let user = await User.findOne({ telegramId });
    if (!user) {
      user = await User.create({ telegramId });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    if (!user.favorites.some((fav) => fav.toString() === adId)) {
      user.favorites.push(adId);
    }

    if (!ad.watchers.includes(telegramId)) {
      ad.watchers.push(telegramId);
    }

    await Promise.all([user.save(), ad.save()]);

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to add favorite', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const { adId } = req.params;
    const telegramId = parseTelegramId(req.query.telegramId);

    if (telegramId === null || !adId) {
      return res.status(400).json({ error: 'telegramId and adId are required' });
    }

    const user = await User.findOne({ telegramId });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    user.favorites = user.favorites.filter((fav) => fav.toString() !== adId);

    const ad = await Ad.findById(adId);
    if (ad) {
      ad.watchers = ad.watchers.filter((id) => id !== telegramId);
      await ad.save();
    }

    await user.save();

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to remove favorite', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
