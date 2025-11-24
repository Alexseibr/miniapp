import { Router } from 'express';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import adsRoutes from './routes/ads.js';
import favoritesRoutes from './routes/favorites.js';
import notificationsRoutes from './routes/notifications.js';
import ordersRoutes from './routes/orders.js';
import chatsRoutes from './routes/chats.js';
import { success } from './utils/response.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(
    success({
      name: 'Mobile API',
      version: 'v1',
      status: 'ok',
    })
  );
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/ads', adsRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/orders', ordersRoutes);
router.use('/chats', chatsRoutes);

export function registerMobileApi(app) {
  app.use('/api/mobile/v1', router);
}

export default router;
