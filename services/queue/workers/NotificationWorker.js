/**
 * NotificationWorker - Processes Telegram notification jobs
 * Rate limited to 25 messages/second per Telegram API limits
 */

import { BaseWorker } from './BaseWorker.js';
import { QUEUES } from '../config.js';

class NotificationWorker extends BaseWorker {
  constructor(telegramBot) {
    super(QUEUES.NOTIFICATIONS, async (job) => this.processNotification(job));
    this.telegramBot = telegramBot;
    this.sentToday = 0;
    this.lastResetDate = new Date().toDateString();
  }

  /**
   * Set Telegram bot instance
   */
  setBot(bot) {
    this.telegramBot = bot;
  }

  /**
   * Process a notification job
   */
  async processNotification(job) {
    const { type, targetTelegramId, payload, options = {} } = job.data;

    if (!this.telegramBot) {
      throw new Error('Telegram bot not initialized');
    }

    if (!targetTelegramId) {
      throw new Error('Missing targetTelegramId');
    }

    this._checkDailyLimit();

    switch (type) {
      case 'message':
        return this._sendMessage(targetTelegramId, payload, options);
      
      case 'photo':
        return this._sendPhoto(targetTelegramId, payload, options);
      
      case 'callback':
        return this._sendWithCallback(targetTelegramId, payload, options);
      
      case 'batch':
        return this._processBatch(payload.messages, options);
      
      default:
        return this._sendMessage(targetTelegramId, payload.text || payload, options);
    }
  }

  /**
   * Send text message
   */
  async _sendMessage(chatId, payload, options) {
    const text = typeof payload === 'string' ? payload : payload.text;
    const extra = {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    };

    if (payload.buttons) {
      extra.reply_markup = {
        inline_keyboard: payload.buttons,
      };
    }

    const result = await this.telegramBot.telegram.sendMessage(chatId, text, extra);
    this.sentToday++;
    
    return { messageId: result.message_id, chatId };
  }

  /**
   * Send photo with caption
   */
  async _sendPhoto(chatId, payload, options) {
    const result = await this.telegramBot.telegram.sendPhoto(
      chatId,
      payload.photo,
      {
        caption: payload.caption,
        parse_mode: 'HTML',
        ...options,
      }
    );
    this.sentToday++;
    
    return { messageId: result.message_id, chatId };
  }

  /**
   * Send message with inline keyboard
   */
  async _sendWithCallback(chatId, payload, options) {
    const result = await this.telegramBot.telegram.sendMessage(
      chatId,
      payload.text,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: payload.keyboard,
        },
        ...options,
      }
    );
    this.sentToday++;
    
    return { messageId: result.message_id, chatId };
  }

  /**
   * Process batch of messages
   */
  async _processBatch(messages, options) {
    const results = [];
    const delay = options.batchDelay || 50;

    for (const msg of messages) {
      try {
        const result = await this._sendMessage(
          msg.chatId,
          msg.text,
          msg.options || {}
        );
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, chatId: msg.chatId, error: error.message });
      }

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { processed: results.length, results };
  }

  /**
   * Check and reset daily limit
   */
  _checkDailyLimit() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.sentToday = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Get notification stats
   */
  getNotificationStats() {
    return {
      ...this.getStats(),
      sentToday: this.sentToday,
    };
  }

  /**
   * Handle failed notification
   */
  async onJobFailed(job, error) {
    const { targetTelegramId, type } = job.data;
    
    if (error.message.includes('blocked') || error.message.includes('deactivated')) {
      console.log(`[NotificationWorker] User ${targetTelegramId} blocked/deactivated bot`);
    }
  }
}

export const notificationWorker = new NotificationWorker();
export default notificationWorker;
