import express from 'express';
import authMiniApp from '../middleware/authMiniApp';
import { createAd, getAdById, getAds, updatePrice, updateStatus } from '../controllers/adsController';

const router = express.Router();

router.get('/', getAds);
router.get('/:id', getAdById);
router.post('/', authMiniApp, createAd);
router.put('/:id/price', authMiniApp, updatePrice);
router.put('/:id/status', authMiniApp, updateStatus);

export default router;
