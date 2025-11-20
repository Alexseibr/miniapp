import express from 'express';
import { getMe } from '../controllers/usersController';
import authMiniApp from '../middleware/authMiniApp';

const router = express.Router();

router.get('/me', authMiniApp, getMe);

export default router;
