import { Router } from 'express';
import { z } from 'zod';
import Order from '../../../models/Order.js';
import Ad from '../../../models/Ad.js';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import { ensureNumericUserId } from '../utils/user.js';

const router = Router();

const createSchema = z.object({
  adId: z.string(),
  quantity: z.coerce.number().min(1).default(1),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  comment: z.string().optional(),
  address: z.string().optional(),
});

router.use(mobileAuth);

router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const payload = req.validatedBody;
    const ad = await Ad.findById(payload.adId);
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    const buyerId = await ensureNumericUserId(req.currentUser);

    const order = await Order.create({
      user: req.currentUser._id,
      buyerTelegramId: buyerId,
      buyerName: payload.contactName || req.currentUser.firstName,
      buyerPhone: payload.contactPhone || req.currentUser.phone,
      comment: payload.comment,
      items: [
        {
          adId: ad._id,
          title: ad.title,
          quantity: payload.quantity,
          price: ad.price,
          currency: ad.currency,
          sellerTelegramId: ad.sellerTelegramId,
        },
      ],
      totalPrice: ad.price * payload.quantity,
      seasonCode: ad.seasonCode,
    });

    return sendSuccess(res, { id: order._id });
  } catch (error) {
    return handleRouteError(res, error, 'ORDER_CREATE_FAILED');
  }
});

router.get('/my', async (req, res) => {
  try {
    const orders = await Order.find({ user: req.currentUser._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'items.adId', select: 'title price photos' })
      .lean();

    return sendSuccess(res, orders);
  } catch (error) {
    return handleRouteError(res, error, 'ORDERS_FETCH_FAILED');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({ path: 'items.adId', select: 'title price photos' });
    if (!order || order.user.toString() !== req.currentUser._id.toString()) {
      return sendError(res, 404, 'NOT_FOUND', 'Заказ не найден');
    }

    return sendSuccess(res, order);
  } catch (error) {
    return handleRouteError(res, error, 'ORDER_FETCH_FAILED');
  }
});

export default router;
