const express = require('express');
const Ad = require('../../models/Ad');
const authFromTelegram = require('../middleware/authFromTelegram');

const router = express.Router();

router.get('/', authFromTelegram, async (req, res) => {
  try {
    const sellerId = req.currentUser?.telegramId;

    if (!sellerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ads = await Ad.find({ sellerTelegramId: sellerId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items: ads || [] });
  } catch (error) {
    console.error('Failed to load user ads', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
