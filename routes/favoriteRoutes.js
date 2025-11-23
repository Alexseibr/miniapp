import express from 'express';
import { Router } from 'express';
import { telegramInitDataMiddleware } from '../middleware/telegramAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import Favorite from '../models/Favorite.js';

const router = Router();

router.use(telegramInitDataMiddleware, requireAuth);

router.get('/my', async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.currentUser._id });
    return res.json(favorites);
  } catch (error) {
    console.error('Failed to load favorites', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
