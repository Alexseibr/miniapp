const express = require('express');
const authMiddleware = require('../middleware/auth');
const Order = require('../models/Order');

const router = express.Router();

router.use(authMiddleware);

router.get('/my', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.currentUser._id });
    return res.json(orders);
  } catch (error) {
    console.error('Failed to load orders', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
