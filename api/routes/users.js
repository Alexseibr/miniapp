import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(501).json({ message: 'User endpoints are not implemented yet' });
});

export default router;
