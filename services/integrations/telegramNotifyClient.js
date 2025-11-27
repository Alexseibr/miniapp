import axios from 'axios';

/**
 * Telegram Notification Client - отправка уведомлений через Telegram Bot API
 * 
 * Используется как fallback когда push-уведомления недоступны
 */

const TELEGRAM_API_URL = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

/**
 * Отправить текстовое сообщение пользователю
 * 
 * @param {Number|String} chatId - Telegram chat_id или user_id
 * @param {String} text - текст сообщения
 * @param {Object} options - дополнительные опции (parse_mode, reply_markup и т.д.)
 */
export async function sendTelegramMessage(chatId, text, options = {}) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN not configured');
    return { success: false, error: 'Telegram not configured' };
  }

  if (!chatId) {
    return { success: false, error: 'No chat_id provided' };
  }

  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || 'HTML',
      disable_web_page_preview: options.disable_preview !== false,
      reply_markup: options.reply_markup || undefined,
    }, {
      timeout: 10000,
    });

    if (response.data.ok) {
      console.log(`[Telegram] Message sent to ${chatId}`);
      return { success: true, messageId: response.data.result.message_id };
    }

    return { success: false, error: response.data.description };

  } catch (error) {
    console.error('[Telegram] Error sending message:', error.message);
    
    // Проверяем специфичные ошибки Telegram
    const errorDescription = error.response?.data?.description || '';
    
    // Пользователь заблокировал бота или не существует
    if (
      errorDescription.includes('bot was blocked') ||
      errorDescription.includes('user is deactivated') ||
      errorDescription.includes('chat not found')
    ) {
      return { 
        success: false, 
        error: errorDescription,
        userBlocked: true,
      };
    }

    return { success: false, error: error.message };
  }
}

/**
 * Отправить уведомление о новом объявлении
 * 
 * @param {Number|String} chatId - Telegram user_id
 * @param {Object} ad - объект объявления
 * @param {String} frontendUrl - базовый URL фронтенда
 */
export async function sendNewAdNotification(chatId, ad, frontendUrl) {
  const adUrl = `${frontendUrl}/ads/${ad._id}`;
  
  const text = `🆕 <b>Рядом с вами появилось новое объявление!</b>\n\n` +
    `📦 ${ad.title}\n` +
    `💰 ${ad.price} ${ad.currency || 'BYN'}\n` +
    (ad.address ? `📍 ${ad.address}\n` : '') +
    `\n<a href="${adUrl}">Смотреть объявление →</a>`;

  return sendTelegramMessage(chatId, text, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[
        { text: '👀 Смотреть', url: adUrl },
      ]],
    },
  });
}

/**
 * Отправить уведомление об изменении цены
 */
export async function sendPriceChangeNotification(chatId, ad, oldPrice, newPrice, frontendUrl) {
  const adUrl = `${frontendUrl}/ads/${ad._id}`;
  const priceChange = newPrice < oldPrice ? '📉 снизилась' : '📈 выросла';
  
  const text = `${priceChange}\n\n` +
    `📦 ${ad.title}\n` +
    `💰 Было: ${oldPrice} → Стало: ${newPrice} ${ad.currency || 'BYN'}\n` +
    `\n<a href="${adUrl}">Смотреть объявление →</a>`;

  return sendTelegramMessage(chatId, text, {
    parse_mode: 'HTML',
  });
}

/**
 * Проверить доступность Telegram API
 */
export async function checkTelegramConnection() {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'Token not configured' };
  }

  try {
    const url = `${TELEGRAM_API_URL}/bot${TELEGRAM_BOT_TOKEN}/getMe`;
    const response = await axios.get(url, { timeout: 5000 });
    
    if (response.data.ok) {
      return { ok: true, botInfo: response.data.result };
    }
    return { ok: false, error: 'Invalid response' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export default {
  sendTelegramMessage,
  sendNewAdNotification,
  sendPriceChangeNotification,
  checkTelegramConnection,
};
