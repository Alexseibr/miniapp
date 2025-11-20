const express = require('express');
const { telegramInitDataMiddleware } = require('../middleware/telegramAuth');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.use(telegramInitDataMiddleware, requireAuth);

function formatUser(user) {
  if (!user) return null;

  return {
    id: user._id,
    telegramId: user.telegramId,
    username: user.username,
    name: user.name || user.firstName,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    location: user.location || null,
    favoritesCount: user.favoritesCount || 0,
    ordersCount: user.ordersCount || 0,
  };
}

router.get('/me', (req, res) => {
  return res.json(formatUser(req.currentUser));
});

router.put('/me', async (req, res) => {
  try {
    const { name, email, avatar, phone } = req.body || {};

    if (phone && phone !== req.currentUser.phone) {
      return res.status(400).json({ message: 'Номер телефона нельзя изменить' });
    }

    const updates = {};

    if (name !== undefined) {
      updates.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const emailRegex = /.+@.+\..+/;
      if (normalizedEmail && !emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ message: 'Некорректный email' });
      }
      updates.email = normalizedEmail || undefined;
    }

    if (avatar !== undefined) {
      updates.avatar = String(avatar).trim();
    }

    Object.assign(req.currentUser, updates);
    await req.currentUser.save();

    return res.json(formatUser(req.currentUser));
  } catch (error) {
    console.error('Failed to update profile', error);
    return res.status(500).json({ message: 'Не удалось обновить профиль' });
  }
});

router.post('/me/location', async (req, res) => {
  const { lat, lng } = req.body || {};
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    req.currentUser.location = {
      lat: latitude,
      lng: longitude,
      updatedAt: new Date(),
    };

    await req.currentUser.save();

    return res.json({ success: true, location: req.currentUser.location });
  } catch (error) {
    console.error('Failed to update user location', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
