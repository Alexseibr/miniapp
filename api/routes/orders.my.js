const express = require('express');
const Order = require('../../models/Order');
const authFromTelegram = require('../middleware/authFromTelegram');

const router = express.Router();

router.get('/', authFromTelegram, async (req, res) => {
  try {
    const buyerTelegramId = req.currentUser?.telegramId;

    if (!buyerTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orders = await Order.find({ buyerTelegramId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items: orders || [] });
  } catch (error) {
    console.error('Failed to load user orders', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
