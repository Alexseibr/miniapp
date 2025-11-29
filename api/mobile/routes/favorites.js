import { Router } from 'express';
import Favorite from '../../../models/Favorite.js';
import Ad from '../../../models/Ad.js';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import { ensureNumericUserId } from '../utils/user.js';

const router = Router();

router.use(mobileAuth);

router.get('/', async (req, res) => {
  try {
    const numericId = await ensureNumericUserId(req.currentUser);
    const favorites = await Favorite.find({ userTelegramId: String(numericId) })
      .populate({ path: 'adId', select: 'title price currency city photos status' })
      .lean();

    const items = favorites
      .filter((fav) => fav.adId)
      .map((fav) => ({
        id: fav.adId._id,
        title: fav.adId.title,
        price: fav.adId.price,
        currency: fav.adId.currency,
        city: fav.adId.city,
        thumbnail: fav.adId.photos?.[0] || null,
        status: fav.adId.status,
        addedAt: fav.createdAt,
      }));

    return sendSuccess(res, items);
  } catch (error) {
    return handleRouteError(res, error, 'FAVORITES_FETCH_FAILED');
  }
});

router.post('/:adId', async (req, res) => {
  try {
    const numericId = await ensureNumericUserId(req.currentUser);
    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    await Favorite.findOneAndUpdate(
      { userTelegramId: String(numericId), adId: ad._id },
      { user: req.currentUser._id, userTelegramId: String(numericId), adId: ad._id },
      { upsert: true, new: true }
    );

    return sendSuccess(res, { adId: ad._id, isFavorite: true });
  } catch (error) {
    return handleRouteError(res, error, 'FAVORITE_ADD_FAILED');
  }
});

router.delete('/:adId', async (req, res) => {
  try {
    const numericId = await ensureNumericUserId(req.currentUser);
    const ad = await Ad.findById(req.params.adId);
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    await Favorite.deleteOne({ userTelegramId: String(numericId), adId: ad._id });
    return sendSuccess(res, { adId: ad._id, isFavorite: false });
  } catch (error) {
    return handleRouteError(res, error, 'FAVORITE_REMOVE_FAILED');
  }
});

export default router;
