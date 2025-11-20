import express from 'express';
import { getNearby } from '../controllers/geoController';

const router = express.Router();

router.get('/nearby', getNearby);

export default router;
