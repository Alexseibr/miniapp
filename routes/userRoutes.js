const express = require('express');
const { auth } = require('../middleware/auth');
const { formatUser } = require('../utils/formatUser');

const router = express.Router();

router.use(auth);

router.get('/me', (req, res) => {
  return res.json(formatUser(req.currentUser));
});

router.put('/me', async (req, res) => {
  try {
    const { name, firstName, lastName, email, avatar, phone } = req.body || {};

    if (phone && phone !== req.currentUser.phone) {
      return res.status(400).json({ message: 'Номер телефона нельзя изменить' });
    }

    const updates = {};

    if (name !== undefined) {
      updates.name = String(name).trim();
      updates.firstName = updates.firstName || updates.name;
    }

    if (firstName !== undefined) {
      updates.firstName = String(firstName).trim();
    }

    if (lastName !== undefined) {
      updates.lastName = String(lastName).trim();
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
