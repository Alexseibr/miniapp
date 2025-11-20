import express from 'express';
import authMiniApp from '../middleware/authMiniApp';

const router = express.Router();

router.get('/ping', authMiniApp, (req, res) => {
  return res.json({ status: 'ok', user: req.currentUser?.telegramId });
});

export default router;
