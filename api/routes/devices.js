import express from 'express';
import Device from '../../models/Device.js';
import { telegramInitDataMiddleware } from '../../middleware/telegramAuth.js';
import eventBus, { Events } from '../../shared/events/eventBus.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * Middleware для аутентификации (JWT или Telegram initData)
 */
async function authMiddleware(req, res, next) {
  // Пробуем JWT из Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.SESSION_SECRET);
      req.currentUser = { _id: decoded.userId, telegramId: decoded.telegramId };
      return next();
    } catch (error) {
      // JWT невалидный, пробуем Telegram
    }
  }

  // Пробуем Telegram initData
  return telegramInitDataMiddleware(req, res, next);
}

/**
 * POST /api/devices/register
 * 
 * Регистрация или обновление устройства
 * 
 * Body:
 * {
 *   "deviceId": "uuid-string",
 *   "platform": "ios" | "android" | "web",
 *   "pushToken": "string or null",
 *   "geo": { "lat": number, "lng": number },
 *   "appVersion": "1.0.0",
 *   "osVersion": "iOS 17.0"
 * }
 */
router.post('/register', authMiddleware, async (req, res) => {
  try {
    const { deviceId, platform, pushToken, geo, appVersion, osVersion } = req.body;

    // Валидация
    if (!deviceId) {
      return res.status(400).json({ ok: false, error: 'deviceId is required' });
    }

    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ ok: false, error: 'Invalid platform. Must be ios, android, or web' });
    }

    // Валидация geo если передано
    if (geo) {
      if (typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
        return res.status(400).json({ ok: false, error: 'Invalid geo format. Must have lat and lng as numbers' });
      }
      if (geo.lat < -90 || geo.lat > 90 || geo.lng < -180 || geo.lng > 180) {
        return res.status(400).json({ ok: false, error: 'Invalid geo coordinates' });
      }
    }

    const userId = req.currentUser._id;

    // Upsert устройства
    const device = await Device.upsertDevice(userId, {
      deviceId,
      platform,
      pushToken: pushToken || null,
      geo,
      appVersion,
      osVersion,
    });

    // Эмитим событие регистрации
    eventBus.safeEmit(Events.DEVICE_REGISTERED, {
      userId: userId.toString(),
      deviceId,
      platform,
      hasPushToken: !!pushToken,
    });

    console.log(`[Devices] Registered device: ${deviceId} for user ${userId}`);

    res.json({
      ok: true,
      device: {
        deviceId: device.deviceId,
        platform: device.platform,
        pushEnabled: device.pushEnabled,
        hasGeo: !!device.lastGeo,
        lastSeenAt: device.lastSeenAt,
      },
    });

  } catch (error) {
    console.error('[Devices] Register error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/devices/geo
 * 
 * Обновление геолокации устройства
 * 
 * Body:
 * {
 *   "deviceId": "uuid-string",
 *   "geo": { "lat": number, "lng": number }
 * }
 */
router.post('/geo', authMiddleware, async (req, res) => {
  try {
    const { deviceId, geo } = req.body;

    // Валидация
    if (!deviceId) {
      return res.status(400).json({ ok: false, error: 'deviceId is required' });
    }

    if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
      return res.status(400).json({ ok: false, error: 'geo with lat and lng is required' });
    }

    if (geo.lat < -90 || geo.lat > 90 || geo.lng < -180 || geo.lng > 180) {
      return res.status(400).json({ ok: false, error: 'Invalid geo coordinates' });
    }

    const userId = req.currentUser._id;

    // Обновляем геолокацию
    const device = await Device.updateGeo(userId, deviceId, geo);

    if (!device) {
      return res.status(404).json({ ok: false, error: 'Device not found. Please register first.' });
    }

    // Эмитим событие обновления гео
    eventBus.safeEmit(Events.DEVICE_GEO_UPDATED, {
      userId: userId.toString(),
      deviceId,
      geo,
    });

    res.json({
      ok: true,
      lastSeenAt: device.lastSeenAt,
    });

  } catch (error) {
    console.error('[Devices] Geo update error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/devices/my
 * 
 * Получить список своих устройств
 */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.currentUser._id;
    
    const devices = await Device.find({ userId })
      .select('deviceId platform pushEnabled lastGeo lastSeenAt appVersion createdAt')
      .sort({ lastSeenAt: -1 })
      .lean();

    res.json({
      ok: true,
      devices: devices.map(d => ({
        deviceId: d.deviceId,
        platform: d.platform,
        pushEnabled: d.pushEnabled,
        hasGeo: !!d.lastGeo,
        lastSeenAt: d.lastSeenAt,
        appVersion: d.appVersion,
        createdAt: d.createdAt,
      })),
    });

  } catch (error) {
    console.error('[Devices] List error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/devices/:deviceId
 * 
 * Удалить устройство
 */
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.currentUser._id;
    const { deviceId } = req.params;

    const result = await Device.findOneAndDelete({ userId, deviceId });

    if (!result) {
      return res.status(404).json({ ok: false, error: 'Device not found' });
    }

    res.json({ ok: true });

  } catch (error) {
    console.error('[Devices] Delete error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/devices/:deviceId/push
 * 
 * Включить/выключить push-уведомления для устройства
 * 
 * Body: { "enabled": boolean }
 */
router.patch('/:deviceId/push', authMiddleware, async (req, res) => {
  try {
    const userId = req.currentUser._id;
    const { deviceId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'enabled must be boolean' });
    }

    const device = await Device.findOneAndUpdate(
      { userId, deviceId },
      { $set: { pushEnabled: enabled } },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ ok: false, error: 'Device not found' });
    }

    res.json({
      ok: true,
      pushEnabled: device.pushEnabled,
    });

  } catch (error) {
    console.error('[Devices] Push toggle error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

export default router;
