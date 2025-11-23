import Subscription from '../models/Subscription.js';
import { haversineDistanceKm } from '../utils/haversine.js';

async function findMatchingSubscriptions(ad) {
  try {
    const query = {
      isActive: true,
    };

    if (ad.categoryId) {
      query['filters.categoryId'] = { $in: [ad.categoryId, null, undefined] };
    }

    if (ad.subcategoryId) {
      query['filters.subcategoryId'] = { $in: [ad.subcategoryId, null, undefined] };
    }

    if (ad.seasonCode) {
      query['filters.seasonCode'] = { $in: [ad.seasonCode, null, undefined] };
    }

    const activeSubscriptions = await Subscription.find(query);

    const matches = [];
    for (const subscription of activeSubscriptions) {
      if (shouldNotifySubscription(subscription, ad)) {
        matches.push(subscription);
      }
    }

    return matches;
  } catch (error) {
    console.error('findMatchingSubscriptions error:', error);
    return [];
  }
}

function shouldNotifySubscription(subscription, ad) {
  const filters = subscription.filters || {};

  if (filters.categoryId && filters.categoryId !== ad.categoryId) {
    return false;
  }

  if (filters.subcategoryId && filters.subcategoryId !== ad.subcategoryId) {
    return false;
  }

  if (filters.seasonCode && filters.seasonCode !== ad.seasonCode) {
    return false;
  }

  if (filters.minPrice != null && ad.price < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice != null && ad.price > filters.maxPrice) {
    return false;
  }

  if (filters.location && filters.location.lat != null && filters.location.lng != null) {
    if (!ad.location || ad.location.lat == null || ad.location.lng == null) {
      return false;
    }

    const radiusKm = filters.location.radiusKm || 10;
    const distance = haversineDistanceKm(
      filters.location.lat,
      filters.location.lng,
      ad.location.lat,
      ad.location.lng
    );

    if (distance == null || distance > radiusKm) {
      return false;
    }
  }

  return true;
}

async function sendSubscriptionNotifications(bot, ad, subscriptions) {
  if (!bot || !subscriptions || subscriptions.length === 0) {
    return;
  }

  const message = formatNewAdNotification(ad);

  for (const subscription of subscriptions) {
    try {
      await bot.telegram.sendMessage(subscription.userTelegramId, message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '👀 Посмотреть',
                url: `https://t.me/${process.env.BOT_USERNAME || 'KetmarM_bot'}/miniapp?startapp=ad_${ad._id}`,
              },
            ],
          ],
        },
      });

      subscription.lastNotificationAt = new Date();
      await subscription.save();
    } catch (error) {
      console.error(`Failed to send notification to ${subscription.userTelegramId}:`, error);
      
      if (error.response && error.response.error_code === 403) {
        subscription.isActive = false;
        await subscription.save();
      }
    }
  }
}

function formatNewAdNotification(ad) {
  const title = ad.title || 'Новое объявление';
  const price = ad.price ? `${ad.price} ${ad.currency || 'BYN'}` : 'Цена не указана';
  const description = ad.description
    ? ad.description.substring(0, 100) + (ad.description.length > 100 ? '...' : '')
    : '';

  return `
🔔 <b>Новое объявление по вашей подписке!</b>

<b>${title}</b>
💰 ${price}
${description ? `\n${description}` : ''}
  `.trim();
}

export { findMatchingSubscriptions,sendSubscriptionNotifications,shouldNotifySubscription };
