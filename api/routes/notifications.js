import express from 'express';
import { Router } from 'express';
import Notification from '../../models/Notification.js';

const router = Router();

// GET /api/notifications?telegramId=...
router.get('/', async (req, res) => {
  try {
    const { telegramId } = req.query;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId обязателен' });
    }

    const tgId = Number(telegramId);
    if (!Number.isFinite(tgId)) {
      return res.status(400).json({ error: 'telegramId должен быть числом' });
    }

    const items = await Notification.find({ userTelegramId: tgId, isSent: false })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
