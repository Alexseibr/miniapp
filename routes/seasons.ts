import express from 'express';
import { getSeasonShowcase } from '../controllers/seasonsController';

const router = express.Router();

router.get('/:seasonCode', getSeasonShowcase);

export default router;
