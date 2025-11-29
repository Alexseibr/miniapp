import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import Order from '../../models/Order.js';
import SellerProfile from '../../models/SellerProfile.js';
import { haversineDistanceKm } from '../../utils/haversine.js';

const router = Router();

function resolveDayRange(dateString) {
  const start = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { $gte: start, $lt: end };
}

router.get('/route-plan', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const { date, startLat, startLng } = req.query;

    const profile = await SellerProfile.findOne({ userId: user._id });
    if (!profile || !['FARMER', 'ARTISAN'].includes(profile.shopRole)) {
      return res.status(400).json({ message: 'Маршрут доступен только для фермера или ремесленника' });
    }

    const range = resolveDayRange(String(date || ''));
    if (!range) {
      return res.status(400).json({ message: 'Некорректная дата' });
    }

    let currentPoint = null;
    const latNumber = Number(startLat);
    const lngNumber = Number(startLng);
    if (Number.isFinite(latNumber) && Number.isFinite(lngNumber)) {
      currentPoint = { lat: latNumber, lng: lngNumber };
    } else if (profile.baseLocation?.lat != null && profile.baseLocation?.lng != null) {
      currentPoint = { lat: Number(profile.baseLocation.lat), lng: Number(profile.baseLocation.lng) };
    }

    if (!currentPoint) {
      return res.status(400).json({ message: 'Не задана стартовая точка маршрута' });
    }

    const orders = await Order.find({
      sellerId: profile.userId,
      status: { $in: ['CONFIRMED', 'confirmed', 'processed'] },
      deliveryRequired: true,
      scheduledDate: range,
    }).lean();

    const remaining = orders.filter((order) => order.deliveryLocation?.lat != null && order.deliveryLocation?.lng != null);
    const sorted = [];
    let cursor = { ...currentPoint };

    while (remaining.length) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      remaining.forEach((order, idx) => {
        const dist = haversineDistanceKm(
          cursor.lat,
          cursor.lng,
          Number(order.deliveryLocation.lat),
          Number(order.deliveryLocation.lng)
        );
        if (dist != null && dist < nearestDistance) {
          nearestDistance = dist;
          nearestIndex = idx;
        }
      });

      const [nextOrder] = remaining.splice(nearestIndex, 1);
      sorted.push({ ...nextOrder, distanceKmFromPrev: nearestDistance });
      cursor = {
        lat: Number(nextOrder.deliveryLocation.lat),
        lng: Number(nextOrder.deliveryLocation.lng),
      };
    }

    return res.json({ items: sorted });
  } catch (error) {
    console.error('[FarmerOrders] route plan error', error);
    return res.status(500).json({ message: 'Не удалось построить маршрут' });
  }
});

export default router;
