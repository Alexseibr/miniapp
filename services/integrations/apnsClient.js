/**
 * APNs Client - отправка push-уведомлений через Apple Push Notification service
 * 
 * Примечание: Полноценная интеграция требует:
 * - APNS_KEY_ID - Key ID из Apple Developer Console
 * - APNS_TEAM_ID - Team ID
 * - APNS_KEY_PATH - путь к .p8 файлу ключа
 * - APNS_BUNDLE_ID - Bundle ID приложения
 * 
 * Сейчас реализован mock-клиент для тестирования
 */

const APNS_CONFIGURED = !!(
  process.env.APNS_KEY_ID && 
  process.env.APNS_TEAM_ID && 
  process.env.APNS_KEY_PATH
);

/**
 * Отправить push-уведомление через APNs
 * 
 * @param {String} deviceToken - APNs device token
 * @param {Object} notification - { title, body, badge?, sound? }
 * @param {Object} data - дополнительные данные
 * @returns {Promise<{ success: boolean, error?: string, tokenInvalid?: boolean }>}
 */
export async function sendApnsNotification(deviceToken, notification, data = {}) {
  if (!APNS_CONFIGURED) {
    console.warn('[APNs] APNs not configured, skipping push');
    return { success: false, error: 'APNs not configured', shouldRetry: false };
  }

  if (!deviceToken) {
    return { success: false, error: 'No device token provided', shouldRetry: false };
  }

  try {
    // TODO: Реализовать полноценную интеграцию с APNs HTTP/2 API
    // Для production нужно использовать библиотеку apn или node-apn
    
    console.log(`[APNs] Sending notification to: ${deviceToken.substring(0, 20)}...`);
    console.log(`[APNs] Title: ${notification.title}`);
    console.log(`[APNs] Body: ${notification.body}`);

    // Mock response для разработки
    // В production здесь будет реальный HTTP/2 запрос к APNs
    return { success: true };

  } catch (error) {
    console.error('[APNs] Error:', error.message);

    // Проверяем APNs ошибки для невалидных токенов
    const invalidTokenErrors = [
      'BadDeviceToken',
      'Unregistered',
      'DeviceTokenNotForTopic',
    ];

    if (invalidTokenErrors.includes(error.reason)) {
      return { 
        success: false, 
        error: error.reason, 
        tokenInvalid: true,
        shouldRetry: false,
      };
    }

    return { success: false, error: error.message, shouldRetry: true };
  }
}

/**
 * Проверить, настроен ли APNs
 */
export function isApnsConfigured() {
  return APNS_CONFIGURED;
}

export default {
  sendApnsNotification,
  isApnsConfigured,
};
