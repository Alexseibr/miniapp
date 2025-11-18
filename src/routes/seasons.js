import { Router } from 'express';
import { listSeasons } from '../controllers/seasonsController.js';

const router = Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.get('/', handle(listSeasons));

export default router;
