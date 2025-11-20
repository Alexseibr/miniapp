const express = require('express');
const authMiddleware = require('../middleware/auth');
const Favorite = require('../models/Favorite');

const router = express.Router();

router.use(authMiddleware);

router.get('/my', async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.currentUser._id });
    return res.json(favorites);
  } catch (error) {
    console.error('Failed to load favorites', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
