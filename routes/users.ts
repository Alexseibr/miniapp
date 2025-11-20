import express from 'express';
import authMiniApp from '../middleware/authMiniApp';
import { getMe } from '../controllers/usersController';

const router = express.Router();

router.get('/me', authMiniApp, getMe);

export default router;
