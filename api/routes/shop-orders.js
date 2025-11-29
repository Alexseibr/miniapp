import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import Order from '../../models/Order.js';
import Ad from '../../models/Ad.js';
import SellerProfile from '../../models/SellerProfile.js';
import { haversineDistanceKm } from '../../utils/haversine.js';

const router = Router();

function resolveDateRange(filter) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

  if (filter === 'tomorrow') {
    return { $gte: tomorrowStart, $lt: dayAfterTomorrow };
  }
  if (filter === 'future') {
    return { $gte: dayAfterTomorrow };
  }
  return { $gte: todayStart, $lt: tomorrowStart };
}

function normalizeQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.floor(parsed);
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const {
      adId,
      quantity = 1,
      deliveryRequired = false,
      deliveryAddress,
      deliveryLocation,
      scheduledDate,
    } = req.body || {};

    if (!adId) {
      return res.status(400).json({ message: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Товар не найден' });
    }

    const sellerProfile = await SellerProfile.findOne({ telegramId: ad.sellerTelegramId });
    if (!sellerProfile) {
      return res.status(400).json({ message: 'У товара отсутствует профиль продавца' });
    }

    if (deliveryRequired) {
      const deliveryEnabled = ad.hasDelivery === true && sellerProfile.canDeliver === true;
      if (!deliveryEnabled) {
        return res.status(400).json({ message: 'Доставка для этого товара недоступна' });
      }
      if (deliveryLocation) {
        const lat = Number(deliveryLocation.lat);
        const lng = Number(deliveryLocation.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ message: 'Некорректные координаты доставки' });
        }
      }
    }

    const safeQuantity = normalizeQuantity(quantity);

    if (ad.maxDailyQuantity != null) {
      const available = ad.availableQuantity != null ? ad.availableQuantity : ad.maxDailyQuantity;
      if (available == null || available < safeQuantity) {
        return res.status(400).json({ message: 'Недостаточно доступного количества на выбранную дату' });
      }
      ad.availableQuantity = available - safeQuantity;
      await ad.save();
    }

    const scheduled = scheduledDate ? new Date(scheduledDate) : new Date();

    const order = await Order.create({
      adId: ad._id,
      sellerId: sellerProfile.userId,
      sellerTelegramId: ad.sellerTelegramId,
      shopProfileId: sellerProfile._id,
      user: user?._id,
      buyerId: user?._id || null,
      buyerTelegramId: user.telegramId,
      buyerName: user.firstName,
      buyerUsername: user.username,
      items: [
        {
          adId: ad._id,
          title: ad.title,
          quantity: safeQuantity,
          price: ad.price,
          currency: ad.currency,
          sellerTelegramId: ad.sellerTelegramId,
        },
      ],
      totalPrice: (ad.price || 0) * safeQuantity,
      status: 'NEW',
      deliveryRequired: Boolean(deliveryRequired),
      deliveryAddress,
      deliveryLocation: deliveryLocation && deliveryLocation.lat != null && deliveryLocation.lng != null
        ? { lat: Number(deliveryLocation.lat), lng: Number(deliveryLocation.lng) }
        : undefined,
      scheduledDate: Number.isFinite(new Date(scheduled).getTime()) ? scheduled : new Date(),
    });

    return res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('[ShopOrders] create error', error);
    return res.status(500).json({ message: 'Ошибка создания заказа' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { date = 'today' } = req.query;
    const profile = await SellerProfile.findOne({ userId: user._id });

    if (!profile) {
      return res.json({ items: [] });
    }

    const range = resolveDateRange(String(date));
    const query = {
      shopProfileId: profile._id,
      scheduledDate: range,
    };

    const items = await Order.find(query)
      .sort({ scheduledDate: 1, createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (error) {
    console.error('[ShopOrders] list error', error);
    return res.status(500).json({ message: 'Ошибка получения заказов' });
  }
});

router.get('/route-plan', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { date = 'today' } = req.query;
    const profile = await SellerProfile.findOne({ userId: user._id });

    if (!profile || !profile.baseLocation?.lat || !profile.baseLocation?.lng) {
      return res.status(400).json({ message: 'Не задана стартовая точка маршрута' });
    }

    const range = resolveDateRange(String(date));
    const activeStatuses = ['NEW', 'CONFIRMED', 'new', 'processed'];

    const orders = await Order.find({
      shopProfileId: profile._id,
      scheduledDate: range,
      deliveryRequired: true,
      status: { $in: activeStatuses },
    }).lean();

    let currentPoint = { lat: Number(profile.baseLocation.lat), lng: Number(profile.baseLocation.lng) };
    const remaining = [...orders];
    const sorted = [];

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remaining.forEach((order, index) => {
        const lat = order.deliveryLocation?.lat;
        const lng = order.deliveryLocation?.lng;
        const distance = haversineDistanceKm(currentPoint.lat, currentPoint.lng, Number(lat), Number(lng));
        if (distance != null && distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      const [nextOrder] = remaining.splice(nearestIndex, 1);
      sorted.push({ ...nextOrder, distanceKmFromPrev: nearestDistance });
      if (nextOrder.deliveryLocation?.lat != null && nextOrder.deliveryLocation?.lng != null) {
        currentPoint = { lat: Number(nextOrder.deliveryLocation.lat), lng: Number(nextOrder.deliveryLocation.lng) };
      }
    }

    return res.json({ items: sorted });
  } catch (error) {
    console.error('[ShopOrders] route plan error', error);
    return res.status(500).json({ message: 'Ошибка построения маршрута' });
  }
});

export default router;
