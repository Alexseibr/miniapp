import express from 'express';
import { createAd, getAdById, getAds, getNearbyAds } from '../controllers/adsController';
import authMiniApp from '../middleware/authMiniApp';

const router = express.Router();

router.get('/', getAds);
router.get('/nearby', getNearbyAds);
router.get('/:id', getAdById);
router.post('/', authMiniApp, createAd);

export default router;
