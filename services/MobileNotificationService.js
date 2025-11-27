import Device from '../models/Device.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import { sendFcmNotification, sendFcmMulticast } from './integrations/fcmClient.js';
import { sendApnsNotification } from './integrations/apnsClient.js';
import { sendNewAdNotification, sendTelegramMessage } from './integrations/telegramNotifyClient.js';
import eventBus, { Events } from '../shared/events/eventBus.js';

/**
 * MobileNotificationService - централизованный сервис уведомлений
 * 
 * Приоритет отправки:
 * 1. Push (FCM для Android, APNs для iOS)
 * 2. Telegram fallback если push недоступен
 * 
 * Гео-таргетирование:
 * - Находит пользователей в радиусе объявления
 * - Использует lastGeo устройств для фильтрации
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://ketmar.by';
const DEFAULT_RADIUS_KM = 50; // Радиус по умолчанию для гео-уведомлений

class MobileNotificationService {
  constructor() {
    this.initEventListeners();
  }

  /**
   * Инициализация слушателей событий
   */
  initEventListeners() {
    // Слушаем событие создания объявления
    eventBus.safeOn(Events.AD_CREATED, async (payload) => {
      await this.notifyUsersAboutNewAd(payload.adId);
    });

    // Слушаем событие публикации объявления (для отложенных)
    eventBus.safeOn(Events.AD_PUBLISHED, async (payload) => {
      await this.notifyUsersAboutNewAd(payload.adId);
    });

    // Слушаем события невалидных токенов
    eventBus.safeOn(Events.PUSH_FAILED, async (payload) => {
      if (payload.tokenInvalid) {
        await Device.markTokenInvalid(payload.deviceId, payload.error);
      }
    });

    console.log('[MobileNotificationService] Event listeners initialized');
  }

  /**
   * Уведомить пользователей о новом объявлении в их районе
   * 
   * @param {String} adId - ID объявления
   */
  async notifyUsersAboutNewAd(adId) {
    try {
      console.log(`[MobileNotificationService] Processing new ad notification: ${adId}`);

      // Получаем объявление
      const ad = await Ad.findById(adId).lean();
      if (!ad) {
        console.warn(`[MobileNotificationService] Ad not found: ${adId}`);
        return;
      }

      // Проверяем статус объявления
      if (ad.status !== 'active') {
        console.log(`[MobileNotificationService] Ad is not active: ${ad.status}`);
        return;
      }

      // Получаем геолокацию объявления
      const adLocation = this.extractAdLocation(ad);
      if (!adLocation) {
        console.log(`[MobileNotificationService] Ad has no location, skipping geo-targeting`);
        return;
      }

      // Находим устройства в радиусе
      const devices = await Device.findDevicesInRadius(
        adLocation,
        DEFAULT_RADIUS_KM,
        { excludeUserIds: [ad.userId] } // Не уведомляем автора объявления
      );

      console.log(`[MobileNotificationService] Found ${devices.length} devices in radius`);

      if (devices.length === 0) {
        return;
      }

      // Группируем устройства по пользователям
      const userDevicesMap = this.groupDevicesByUser(devices);

      // Отправляем уведомления каждому пользователю
      const results = await Promise.allSettled(
        Array.from(userDevicesMap.entries()).map(([userId, userDevices]) =>
          this.notifyUser(userDevices, ad)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      console.log(`[MobileNotificationService] Notifications sent: ${successCount}/${userDevicesMap.size}`);

    } catch (error) {
      console.error('[MobileNotificationService] Error notifying about new ad:', error);
    }
  }

  /**
   * Отправить уведомление пользователю
   * 
   * @param {Array} devices - устройства пользователя
   * @param {Object} ad - объявление
   */
  async notifyUser(devices, ad) {
    const notification = {
      title: 'Новое объявление рядом!',
      body: `${ad.title} - ${ad.price} ${ad.currency || 'BYN'}`,
      imageUrl: ad.photos?.[0] || null,
    };

    const data = {
      type: 'new_ad',
      adId: ad._id.toString(),
      url: `${FRONTEND_URL}/ads/${ad._id}`,
    };

    let pushSuccess = false;

    // Пробуем отправить push на все устройства
    for (const device of devices) {
      if (!device.pushToken) continue;

      const result = await this.sendPush(device, notification, data);
      
      if (result.success) {
        pushSuccess = true;
        break; // Достаточно одного успешного push
      }

      // Если токен невалидный - помечаем и эмитим событие
      if (result.tokenInvalid) {
        eventBus.safeEmit(Events.PUSH_FAILED, {
          deviceId: device.deviceId,
          error: result.error,
          tokenInvalid: true,
        });
      }
    }

    // Fallback на Telegram если push не сработал
    if (!pushSuccess) {
      const user = devices[0]?.userId;
      if (user?.telegramId) {
        await sendNewAdNotification(user.telegramId, ad, FRONTEND_URL);
        return { success: true, method: 'telegram' };
      }
    }

    return { success: pushSuccess, method: 'push' };
  }

  /**
   * Отправить push-уведомление на устройство
   */
  async sendPush(device, notification, data) {
    try {
      if (device.platform === 'android') {
        return await sendFcmNotification(device.pushToken, notification, data);
      } else if (device.platform === 'ios') {
        return await sendApnsNotification(device.pushToken, notification, data);
      }
      return { success: false, error: 'Unknown platform' };
    } catch (error) {
      console.error('[MobileNotificationService] Push error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправить массовое уведомление всем пользователям в радиусе
   * 
   * @param {Object} center - { lat, lng }
   * @param {Number} radiusKm - радиус в км
   * @param {Object} notification - { title, body }
   * @param {Object} data - дополнительные данные
   */
  async broadcastToRadius(center, radiusKm, notification, data = {}) {
    try {
      const devices = await Device.findDevicesInRadius(center, radiusKm);
      
      if (devices.length === 0) {
        return { success: true, sentCount: 0 };
      }

      // Разделяем по платформам
      const androidTokens = devices
        .filter(d => d.platform === 'android' && d.pushToken)
        .map(d => d.pushToken);

      const iosDevices = devices
        .filter(d => d.platform === 'ios' && d.pushToken);

      let sentCount = 0;

      // Массовая отправка Android через FCM multicast
      if (androidTokens.length > 0) {
        const result = await sendFcmMulticast(androidTokens, notification, data);
        sentCount += result.successCount || 0;

        // Помечаем невалидные токены
        for (const r of result.results || []) {
          if (r.tokenInvalid) {
            const device = devices.find(d => d.pushToken === r.token);
            if (device) {
              await Device.markTokenInvalid(device.deviceId, r.error);
            }
          }
        }
      }

      // iOS отправляем по одному (APNs не поддерживает multicast)
      for (const device of iosDevices) {
        const result = await sendApnsNotification(device.pushToken, notification, data);
        if (result.success) sentCount++;
        if (result.tokenInvalid) {
          await Device.markTokenInvalid(device.deviceId, result.error);
        }
      }

      return { success: true, sentCount, totalDevices: devices.length };

    } catch (error) {
      console.error('[MobileNotificationService] Broadcast error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправить уведомление конкретному пользователю
   * 
   * @param {String} userId - MongoDB user ID
   * @param {Object} notification - { title, body }
   * @param {Object} data - дополнительные данные
   */
  async notifyUserById(userId, notification, data = {}) {
    try {
      // Получаем устройства пользователя
      const devices = await Device.findUserDevices(userId);

      if (devices.length === 0) {
        // Нет устройств - пробуем Telegram
        const user = await User.findById(userId).select('telegramId').lean();
        if (user?.telegramId) {
          const text = `${notification.title}\n\n${notification.body}`;
          await sendTelegramMessage(user.telegramId, text);
          return { success: true, method: 'telegram' };
        }
        return { success: false, error: 'No devices or Telegram' };
      }

      // Пробуем push
      for (const device of devices) {
        if (!device.pushToken) continue;
        
        const result = await this.sendPush(device, notification, data);
        if (result.success) {
          return { success: true, method: 'push' };
        }
      }

      // Fallback на Telegram
      const user = await User.findById(userId).select('telegramId').lean();
      if (user?.telegramId) {
        const text = `${notification.title}\n\n${notification.body}`;
        await sendTelegramMessage(user.telegramId, text);
        return { success: true, method: 'telegram' };
      }

      return { success: false, error: 'All push attempts failed' };

    } catch (error) {
      console.error('[MobileNotificationService] notifyUserById error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Извлечь координаты из объявления
   */
  extractAdLocation(ad) {
    // Пробуем разные форматы локации
    if (ad.location?.geo?.coordinates) {
      const [lng, lat] = ad.location.geo.coordinates;
      return { lat, lng };
    }
    
    if (ad.location?.lat && ad.location?.lng) {
      return { lat: ad.location.lat, lng: ad.location.lng };
    }

    if (ad.geo?.coordinates) {
      const [lng, lat] = ad.geo.coordinates;
      return { lat, lng };
    }

    return null;
  }

  /**
   * Сгруппировать устройства по пользователям
   */
  groupDevicesByUser(devices) {
    const map = new Map();
    
    for (const device of devices) {
      const userId = device.userId?._id?.toString() || device.userId?.toString();
      if (!userId) continue;

      if (!map.has(userId)) {
        map.set(userId, []);
      }
      map.get(userId).push(device);
    }

    return map;
  }
}

// Singleton instance
const mobileNotificationService = new MobileNotificationService();

export default mobileNotificationService;
