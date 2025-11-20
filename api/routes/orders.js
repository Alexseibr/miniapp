const { Router } = require('express');
const Order = require('../../models/Order.js');
const Ad = require('../../models/Ad.js');
const notifySellers = require('../../services/notifySellers.js');

const router = Router();

const normalizeTelegramId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAuthenticatedTelegramId = (req) => normalizeTelegramId(req.telegramAuth?.user?.id);

/**
 * POST /api/orders
 * Пример:
 * {
 *   "buyerTelegramId": 123,
 *   "buyerName": "Анна",
 *   "buyerUsername": "anna_shop",
 *   "items": [
 *     { "adId": "...", "quantity": 2 },
 *     { "adId": "...", "quantity": 1 }
 *   ],
 *   "comment": "Доставка утром",
 *   "seasonCode": "march8_tulips"
 * }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      buyerName,
      buyerUsername,
      buyerPhone,
      items,
      seasonCode,
      comment,
    } = req.body || {};

    const normalizedBuyerId = getAuthenticatedTelegramId(req);

    if (!normalizedBuyerId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Нужно указать хотя бы один товар' });
    }

    const adIds = items
      .map((item) => item.adId)
      .filter(Boolean);

    if (adIds.length !== items.length) {
      return res.status(400).json({ message: 'Каждый товар должен содержать adId' });
    }

    const ads = await Ad.find({ _id: { $in: adIds } });
    const adsMap = new Map(ads.map((ad) => [ad._id.toString(), ad]));

    const validatedItems = [];

    for (const item of items) {
      const ad = adsMap.get(String(item.adId));

      if (!ad) {
        return res.status(404).json({ message: `Объявление ${item.adId} не найдено` });
      }

      if (ad.status !== 'active') {
        return res.status(400).json({ message: `"${ad.title}" недоступно для заказа` });
      }

      const quantity = Number(item.quantity) || 1;

      if (quantity < 1 || quantity > 1000) {
        return res
          .status(400)
          .json({ message: `Количество для "${ad.title}" должно быть от 1 до 1000` });
      }

      validatedItems.push({
        adId: ad._id,
        title: ad.title,
        quantity,
        price: ad.price,
        currency: ad.currency,
        sellerTelegramId: ad.sellerTelegramId,
      });
    }

    const totalPrice = validatedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      buyerTelegramId: normalizedBuyerId,
      buyerName,
      buyerUsername,
      buyerPhone,
      items: validatedItems,
      totalPrice,
      seasonCode,
      comment,
      status: 'new',
    });

    const botInstance = req.app?.get('bot');
    if (botInstance) {
      notifySellers(order, botInstance).catch((error) => {
        console.error('notifySellers error:', error);
      });
    } else {
      console.warn('Bot instance недоступен, уведомления продавцов пропущены');
    }

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/my?buyerTelegramId=XXX
router.get('/my', async (req, res, next) => {
  try {
    const buyerTelegramId = normalizeTelegramId(req.query.buyerTelegramId);

    if (!buyerTelegramId) {
      return res.status(400).json({ message: 'buyerTelegramId обязателен' });
    }

    const orders = await Order.find({ buyerTelegramId }).sort({ createdAt: -1 });
    res.json({ items: orders });
  } catch (error) {
    next(error);
  }
});

// Совместимость со старым маршрутом /api/orders/:buyerTelegramId
router.get('/:buyerTelegramId', async (req, res, next) => {
  try {
    const buyerTelegramId = normalizeTelegramId(req.params.buyerTelegramId);

    if (!buyerTelegramId) {
      return res.status(400).json({ message: 'Некорректный идентификатор покупателя' });
    }

    const orders = await Order.find({ buyerTelegramId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Принятие заказа продавцом
router.post('/:id/accept', async (req, res, next) => {
  try {
    const { id } = req.params;
    const sellerTelegramId = normalizeTelegramId(req.body?.sellerTelegramId);

    if (!sellerTelegramId) {
      return res.status(400).json({ message: 'sellerTelegramId обязателен' });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    const sellerItems = order.items.filter(
      (item) => Number(item.sellerTelegramId) === sellerTelegramId
    );

    if (sellerItems.length === 0) {
      return res.status(403).json({ message: 'У продавца нет товаров в этом заказе' });
    }

    order.status = 'processed';
    await order.save();

    res.json(order);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['new', 'processed', 'completed', 'cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Статус должен быть одним из: ${allowedStatuses.join(', ')}`,
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
