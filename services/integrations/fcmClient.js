import axios from 'axios';

/**
 * FCM Client - отправка push-уведомлений через Firebase Cloud Messaging
 * 
 * Требуется FCM_SERVER_KEY в переменных окружения
 */

const FCM_API_URL = 'https://fcm.googleapis.com/fcm/send';
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

/**
 * Отправить push-уведомление через FCM
 * 
 * @param {String} token - FCM registration token
 * @param {Object} notification - { title, body, imageUrl? }
 * @param {Object} data - дополнительные данные
 * @returns {Promise<{ success: boolean, error?: string, shouldRetry?: boolean }>}
 */
export async function sendFcmNotification(token, notification, data = {}) {
  if (!FCM_SERVER_KEY) {
    console.warn('[FCM] FCM_SERVER_KEY not configured, skipping push');
    return { success: false, error: 'FCM not configured', shouldRetry: false };
  }

  if (!token) {
    return { success: false, error: 'No token provided', shouldRetry: false };
  }

  try {
    const payload = {
      to: token,
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default',
        badge: 1,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // для Flutter/RN
      },
      priority: 'high',
      content_available: true,
    };

    if (notification.imageUrl) {
      payload.notification.image = notification.imageUrl;
    }

    const response = await axios.post(FCM_API_URL, payload, {
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    // FCM возвращает success: 1 при успешной отправке
    if (response.data.success === 1) {
      console.log(`[FCM] Push sent successfully to token: ${token.substring(0, 20)}...`);
      return { success: true };
    }

    // Проверяем ошибки FCM
    const results = response.data.results || [];
    const error = results[0]?.error;

    // Невалидные токены - не нужно retry
    const invalidTokenErrors = [
      'InvalidRegistration',
      'NotRegistered',
      'MismatchSenderId',
      'InvalidPackageName',
    ];

    if (invalidTokenErrors.includes(error)) {
      console.warn(`[FCM] Invalid token: ${error}`);
      return { 
        success: false, 
        error, 
        shouldRetry: false,
        tokenInvalid: true,
      };
    }

    // Временные ошибки - можно retry
    console.warn(`[FCM] Send failed: ${error}`);
    return { success: false, error, shouldRetry: true };

  } catch (error) {
    console.error('[FCM] Request error:', error.message);
    
    // Сетевые ошибки - можно retry
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { success: false, error: 'Timeout', shouldRetry: true };
    }

    return { success: false, error: error.message, shouldRetry: false };
  }
}

/**
 * Отправить push нескольким устройствам
 * 
 * @param {String[]} tokens - массив FCM токенов
 * @param {Object} notification - { title, body, imageUrl? }
 * @param {Object} data - дополнительные данные
 */
export async function sendFcmMulticast(tokens, notification, data = {}) {
  if (!FCM_SERVER_KEY) {
    console.warn('[FCM] FCM_SERVER_KEY not configured');
    return { success: false, results: [] };
  }

  if (!tokens || tokens.length === 0) {
    return { success: false, results: [] };
  }

  // FCM поддерживает до 1000 токенов за раз
  const batchSize = 1000;
  const results = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    
    try {
      const payload = {
        registration_ids: batch,
        notification: {
          title: notification.title,
          body: notification.body,
          sound: 'default',
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
      };

      if (notification.imageUrl) {
        payload.notification.image = notification.imageUrl;
      }

      const response = await axios.post(FCM_API_URL, payload, {
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Обрабатываем результаты для каждого токена
      const batchResults = (response.data.results || []).map((result, index) => ({
        token: batch[index],
        success: !result.error,
        error: result.error || null,
        tokenInvalid: ['InvalidRegistration', 'NotRegistered'].includes(result.error),
      }));

      results.push(...batchResults);

    } catch (error) {
      console.error('[FCM] Multicast error:', error.message);
      // Помечаем весь batch как failed
      results.push(...batch.map(token => ({
        token,
        success: false,
        error: error.message,
        tokenInvalid: false,
      })));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[FCM] Multicast: ${successCount}/${results.length} sent successfully`);

  return {
    success: successCount > 0,
    successCount,
    failureCount: results.length - successCount,
    results,
  };
}

export default {
  sendFcmNotification,
  sendFcmMulticast,
};
