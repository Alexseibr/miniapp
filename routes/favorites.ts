import express from 'express';
import authMiniApp from '../middleware/authMiniApp';
import {
  checkFavorite,
  getMyFavorites,
  toggleFavorite,
  updateNotifySettings,
} from '../controllers/favoritesController';

const router = express.Router();

router.post('/toggle', authMiniApp, toggleFavorite);
router.get('/my', authMiniApp, getMyFavorites);
router.get('/check/:adId', authMiniApp, checkFavorite);
router.post('/notify-settings', authMiniApp, updateNotifySettings);

export default router;
