import express from 'express';
import authMiniApp from '../middleware/authMiniApp';
import { createAd, getAdById, getAds, getMyAds, updatePrice, updateStatus } from '../controllers/adsController';
import { getNearby } from '../controllers/geoController';

const router = express.Router();

router.get('/', getAds);
router.get('/my', authMiniApp, getMyAds);
router.get('/nearby', getNearby);
router.get('/:id', getAdById);
router.post('/', authMiniApp, createAd);
router.put('/:id/price', authMiniApp, updatePrice);
router.put('/:id/status', authMiniApp, updateStatus);

export default router;
