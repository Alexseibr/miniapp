const express = require('express');
const Favorite = require('../../models/Favorite');
const Ad = require('../../models/Ad');
const authFromTelegram = require('../middleware/authFromTelegram');

const router = express.Router();

router.get('/', authFromTelegram, async (req, res) => {
  try {
    const user = req.currentUser;
    const userTelegramId = user?.telegramId;

    if (!userTelegramId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const favoriteDocs = await Favorite.find({ userTelegramId: String(userTelegramId) })
      .populate('adId')
      .sort({ createdAt: -1 })
      .lean();

    let items = [];

    if (favoriteDocs.length > 0) {
      items = favoriteDocs.map((favorite) => ({
        ad: favorite.adId,
        addedAt: favorite.createdAt,
      }));
    } else if (Array.isArray(user.favorites) && user.favorites.length > 0) {
      const adIds = user.favorites.map((favorite) => favorite.adId).filter(Boolean);
      const ads = await Ad.find({ _id: { $in: adIds } }).lean();
      const adMap = new Map(ads.map((ad) => [String(ad._id), ad]));

      items = user.favorites
        .map((favorite) => {
          const ad = adMap.get(String(favorite.adId));
          if (!ad) {
            return null;
          }

          return {
            ad,
            addedAt: favorite.createdAt || favorite.updatedAt || null,
          };
        })
        .filter(Boolean);
    }

    return res.json({ items });
  } catch (error) {
    console.error('Failed to load favorites', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
