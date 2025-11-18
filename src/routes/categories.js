import { Router } from 'express';
import { listCategories } from '../controllers/categoriesController.js';

const router = Router();

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

router.get('/', handle(listCategories));

export default router;
