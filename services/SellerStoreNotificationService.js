import SellerProfile from '../models/SellerProfile.js';
import SellerSubscription from '../models/SellerSubscription.js';
import NotificationQueue from '../models/NotificationQueue.js';

class SellerStoreNotificationService {
  constructor(bot) {
    this.bot = bot;
  }

  async notifySubscribersNewItem(sellerId, ad) {
    try {
      const profile = await SellerProfile.findById(sellerId);
      if (!profile) return { sent: 0 };

      const subscribers = await SellerSubscription.getSubscriberIds(sellerId, {
        notifyNewProducts: true,
      });

      if (subscribers.length === 0) return { sent: 0 };

      const message = `🆕 У продавца «${profile.name}» появился новый товар:\n\n` +
        `📦 ${ad.title}\n` +
        `💰 ${ad.price} руб.` +
        (ad.unitType ? ` / ${this.formatUnit(ad.unitType)}` : '');

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👀 Посмотреть',
              url: `https://t.me/KetmarM_bot/app?startapp=ad_${ad._id}`,
            },
          ],
          [
            {
              text: '🏪 Магазин',
              url: `https://t.me/KetmarM_bot/app?startapp=store_${profile.slug}`,
            },
          ],
        ],
      };

      let sent = 0;
      for (const subscriber of subscribers) {
        try {
          if (subscriber.telegramId && this.bot) {
            await this.bot.telegram.sendMessage(subscriber.telegramId, message, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
            sent++;
          } else {
            await NotificationQueue.create({
              userId: subscriber.userId,
              type: 'seller_new_product',
              data: {
                sellerId: profile._id,
                sellerName: profile.name,
                adId: ad._id,
                adTitle: ad.title,
                price: ad.price,
              },
            });
            sent++;
          }
        } catch (err) {
          console.error(`[SellerNotify] Failed to notify ${subscriber.telegramId}:`, err.message);
        }
      }

      console.log(`[SellerNotify] Notified ${sent}/${subscribers.length} subscribers about new item`);
      return { sent, total: subscribers.length };
    } catch (error) {
      console.error('[SellerNotify] notifySubscribersNewItem error:', error);
      return { sent: 0, error: error.message };
    }
  }

  async notifySubscribersPriceDrop(sellerId, ad, oldPrice, newPrice) {
    try {
      const profile = await SellerProfile.findById(sellerId);
      if (!profile) return { sent: 0 };

      const subscribers = await SellerSubscription.getSubscriberIds(sellerId, {
        notifyPriceDrops: true,
      });

      if (subscribers.length === 0) return { sent: 0 };

      const discount = Math.round((1 - newPrice / oldPrice) * 100);
      
      const message = `📉 Снижение цены у «${profile.name}»!\n\n` +
        `📦 ${ad.title}\n` +
        `💰 <s>${oldPrice}</s> → <b>${newPrice} руб.</b>\n` +
        `🔥 Скидка ${discount}%`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '👀 Посмотреть',
              url: `https://t.me/KetmarM_bot/app?startapp=ad_${ad._id}`,
            },
          ],
        ],
      };

      let sent = 0;
      for (const subscriber of subscribers) {
        try {
          if (subscriber.telegramId && this.bot) {
            await this.bot.telegram.sendMessage(subscriber.telegramId, message, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
            sent++;
          }
        } catch (err) {
          console.error(`[SellerNotify] Failed to notify price drop ${subscriber.telegramId}:`, err.message);
        }
      }

      console.log(`[SellerNotify] Notified ${sent} subscribers about price drop`);
      return { sent };
    } catch (error) {
      console.error('[SellerNotify] notifySubscribersPriceDrop error:', error);
      return { sent: 0 };
    }
  }

  async notifySubscribersSeasonal(sellerId, message, customKeyboard = null) {
    try {
      const profile = await SellerProfile.findById(sellerId);
      if (!profile || !profile.isFarmer) return { sent: 0 };

      const subscribers = await SellerSubscription.getSubscriberIds(sellerId, {
        notifySeasonal: true,
      });

      if (subscribers.length === 0) return { sent: 0 };

      const fullMessage = `🌾 Фермер «${profile.name}»:\n\n${message}`;

      const keyboard = customKeyboard || {
        inline_keyboard: [
          [
            {
              text: '🏪 В магазин',
              url: `https://t.me/KetmarM_bot/app?startapp=store_${profile.slug}`,
            },
          ],
        ],
      };

      let sent = 0;
      for (const subscriber of subscribers) {
        try {
          if (subscriber.telegramId && this.bot) {
            await this.bot.telegram.sendMessage(subscriber.telegramId, fullMessage, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
            sent++;
          }
        } catch (err) {
          console.error(`[SellerNotify] Failed seasonal notify ${subscriber.telegramId}:`, err.message);
        }
      }

      console.log(`[SellerNotify] Sent seasonal notification to ${sent} subscribers`);
      return { sent };
    } catch (error) {
      console.error('[SellerNotify] notifySubscribersSeasonal error:', error);
      return { sent: 0 };
    }
  }

  async notifySellerNewSubscriber(profile, subscriber) {
    try {
      if (!profile.telegramId || !this.bot) return;

      const subscriberName = subscriber.firstName || subscriber.username || 'Пользователь';
      
      const message = `🔔 Новый подписчик!\n\n` +
        `👤 ${subscriberName} подписался на ваш магазин «${profile.name}»\n` +
        `📊 Всего подписчиков: ${profile.subscribersCount}`;

      await this.bot.telegram.sendMessage(profile.telegramId, message);
    } catch (error) {
      console.error('[SellerNotify] notifySellerNewSubscriber error:', error);
    }
  }

  async notifySellerNewReview(profile, review, reviewer) {
    try {
      if (!profile.telegramId || !this.bot) return;

      const stars = '⭐'.repeat(review.rating);
      const reviewerName = reviewer?.firstName || reviewer?.username || 'Покупатель';
      
      const message = `📝 Новый отзыв!\n\n` +
        `${stars}\n` +
        `От: ${reviewerName}\n` +
        (review.text ? `\n"${review.text.substring(0, 200)}${review.text.length > 200 ? '...' : ''}"` : '') +
        `\n\n📊 Средний рейтинг: ${profile.ratings.score}/5 (${profile.ratings.count} отзывов)`;

      const keyboard = {
        inline_keyboard: [
          [
            {
              text: '💬 Ответить',
              url: `https://t.me/KetmarM_bot/app?startapp=review_${review._id}`,
            },
          ],
        ],
      };

      await this.bot.telegram.sendMessage(profile.telegramId, message, {
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error('[SellerNotify] notifySellerNewReview error:', error);
    }
  }

  formatUnit(unit) {
    const units = {
      kg: 'кг',
      g: 'г',
      piece: 'шт',
      liter: 'л',
      pack: 'уп',
      jar: 'банка',
      bunch: 'пучок',
      bag: 'мешок',
    };
    return units[unit] || unit;
  }
}

export default SellerStoreNotificationService;
