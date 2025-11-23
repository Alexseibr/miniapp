import express from 'express';
import { Router } from 'express';
import { telegramInitDataMiddleware } from '../middleware/telegramAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import { resolveCityCode } from '../utils/cityResolver.js';

const router = Router();

router.use(telegramInitDataMiddleware, requireAuth);

router.get('/me', (req, res) => {
  const user = req.currentUser;

  return res.json({
    id: user._id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    location: user.location || null,
    favoritesCount: user.favoritesCount || 0,
    ordersCount: user.ordersCount || 0,
  });
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

router.post('/initData', telegramInitDataMiddleware, requireAuth, async (req, res) => {
  try {
    const user = req.currentUser;
    const { geoCoordinates, preferredCity } = req.body || {};

    const cityCode = await resolveCityCode({
      initData: req.telegramInitData,
      geoCoordinates,
      preferredCity,
    });

    return res.json({
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        location: user.location || null,
      },
      cityCode,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to process initData', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
