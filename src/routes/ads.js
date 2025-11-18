import { Router } from 'express';
import {
  listAds,
  getAd,
  createAd,
  updateAd,
  deleteAd,
} from '../controllers/adsController.js';

const router = Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.get('/', handle(listAds));
router.get('/:id', handle(getAd));
router.post('/', handle(createAd));
router.patch('/:id', handle(updateAd));
router.delete('/:id', handle(deleteAd));

export default router;
