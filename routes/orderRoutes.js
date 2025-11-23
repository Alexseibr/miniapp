import express from 'express';
const { telegramInitDataMiddleware } = require('../middleware/telegramAuth');
const requireAuth = require('../middleware/requireAuth');
const Order = require('../models/Order');

const router = Router();

router.use(telegramInitDataMiddleware, requireAuth);

router.get('/my', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.currentUser._id });
    return res.json(orders);
  } catch (error) {
    console.error('Failed to load orders', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
