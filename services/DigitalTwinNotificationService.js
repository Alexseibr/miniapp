import UserTwin from '../models/UserTwin.js';
import Ad from '../models/Ad.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';
import SmartSearchService from './SmartSearchService.js';

class DigitalTwinNotificationService {
  constructor() {
    this.processedAdsCache = new Map();
  }

  async processNewAd(ad) {
    if (!ad || !ad._id) return;

    try {
      const matchingTwins = await this.findMatchingWatchItems(ad);

      for (const match of matchingTwins) {
        await this.sendNewAdNotification(match.twin, match.watchItem, ad);
        await this.addRecommendation(match.twin.telegramId, {
          adId: ad._id.toString(),
          type: 'new_match',
          message: `Новое объявление: "${ad.title}" за ${ad.price?.toLocaleString()} Br`,
          query: match.watchItem.query,
          matchScore: match.score,
        });
      }
    } catch (error) {
      console.error('[DigitalTwinNotification] processNewAd error:', error);
    }
  }

  async processPriceDrop(ad, oldPrice, newPrice) {
    if (!ad || !ad._id || oldPrice <= newPrice) return;

    try {
      const matchingTwins = await this.findMatchingWatchItems(ad, true);

      for (const match of matchingTwins) {
        if (!match.watchItem.notifyOnPriceDrop) continue;

        await this.sendPriceDropNotification(match.twin, match.watchItem, ad, oldPrice, newPrice);
        await this.addRecommendation(match.twin.telegramId, {
          adId: ad._id.toString(),
          type: 'price_drop',
          message: `Цена снижена: "${ad.title}" ${oldPrice.toLocaleString()} → ${newPrice.toLocaleString()} Br`,
          query: match.watchItem.query,
          priceDropPercent: Math.round(((oldPrice - newPrice) / oldPrice) * 100),
        });
      }
    } catch (error) {
      console.error('[DigitalTwinNotification] processPriceDrop error:', error);
    }
  }

  async findMatchingWatchItems(ad, priceDropOnly = false) {
    const activeWatchTwins = await UserTwin.find({
      'watchItems.isActive': true,
    });

    const matches = [];

    for (const twin of activeWatchTwins) {
      for (const watchItem of twin.watchItems || []) {
        if (!watchItem.isActive) continue;
        if (priceDropOnly && !watchItem.notifyOnPriceDrop) continue;
        if (!priceDropOnly && !watchItem.notifyOnNew) continue;

        if (watchItem.maxPrice && ad.price > watchItem.maxPrice) continue;
        if (watchItem.minPrice && ad.price < watchItem.minPrice) continue;

        if (watchItem.categoryId && watchItem.categoryId !== ad.categoryId?.toString()) continue;

        const score = this.calculateMatchScore(watchItem, ad);
        if (score > 0.3) {
          matches.push({
            twin,
            watchItem,
            score,
          });
        }
      }
    }

    return matches;
  }

  calculateMatchScore(watchItem, ad) {
    let score = 0;
    const queryWords = (watchItem.query || '').toLowerCase().split(/\s+/).filter(Boolean);
    const titleWords = (ad.title || '').toLowerCase().split(/\s+/).filter(Boolean);
    const descWords = (ad.description || '').toLowerCase().split(/\s+/).filter(Boolean);

    let matchedWords = 0;
    for (const qWord of queryWords) {
      if (qWord.length < 3) continue;

      for (const tWord of titleWords) {
        if (tWord.includes(qWord) || qWord.includes(tWord)) {
          matchedWords += 2;
          break;
        }
      }

      for (const dWord of descWords) {
        if (dWord.includes(qWord) || qWord.includes(dWord)) {
          matchedWords += 1;
          break;
        }
      }
    }

    const totalQueryWords = queryWords.filter(w => w.length >= 3).length;
    if (totalQueryWords > 0) {
      score = matchedWords / (totalQueryWords * 3);
    }

    if (watchItem.categoryId && watchItem.categoryId === ad.categoryId?.toString()) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  async sendNewAdNotification(twin, watchItem, ad) {
    if (!twin.preferences?.notificationsEnabled) return;

    const message = `🔔 *Новое объявление по вашему запросу!*

📝 *${ad.title}*
💰 Цена: ${ad.price?.toLocaleString()} Br
${ad.location?.city ? `📍 ${ad.location.city}` : ''}

_По желанию: "${watchItem.title}"_

👉 [Посмотреть объявление](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    try {
      await sendMessageToTelegramId(twin.telegramId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[DigitalTwinNotification] sendNewAdNotification error:', error);
    }
  }

  async sendPriceDropNotification(twin, watchItem, ad, oldPrice, newPrice) {
    if (!twin.preferences?.notificationsEnabled) return;

    const dropPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

    const message = `📉 *Цена снижена на ${dropPercent}%!*

📝 *${ad.title}*
💰 ~${oldPrice.toLocaleString()}~ → *${newPrice.toLocaleString()} Br*
${ad.location?.city ? `📍 ${ad.location.city}` : ''}

_По желанию: "${watchItem.title}"_

👉 [Посмотреть объявление](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    try {
      await sendMessageToTelegramId(twin.telegramId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[DigitalTwinNotification] sendPriceDropNotification error:', error);
    }
  }

  async addRecommendation(telegramId, recommendation) {
    try {
      await UserTwin.updateOne(
        { telegramId },
        {
          $push: {
            recommendations: {
              $each: [{
                ...recommendation,
                isRead: false,
                createdAt: new Date(),
              }],
              $slice: -50,
            },
          },
        }
      );
    } catch (error) {
      console.error('[DigitalTwinNotification] addRecommendation error:', error);
    }
  }

  async sendNearbyNotification(twin, ad, distanceKm) {
    if (!twin.preferences?.notificationsEnabled) return;

    const message = `📍 *Новое объявление рядом!*

📝 *${ad.title}*
💰 ${ad.price?.toLocaleString()} Br
📍 ${distanceKm.toFixed(1)} км от вас

👉 [Посмотреть объявление](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    try {
      await sendMessageToTelegramId(twin.telegramId, message, { parse_mode: 'Markdown' });
      await this.addRecommendation(twin.telegramId, {
        adId: ad._id.toString(),
        type: 'nearby',
        message: `Рядом с вами: "${ad.title}" за ${ad.price?.toLocaleString()} Br`,
        distanceKm,
      });
    } catch (error) {
      console.error('[DigitalTwinNotification] sendNearbyNotification error:', error);
    }
  }

  async notifyTrendingMatch(twin, ad, trendReason) {
    if (!twin.preferences?.notificationsEnabled) return;

    const message = `🔥 *Популярное объявление!*

📝 *${ad.title}*
💰 ${ad.price?.toLocaleString()} Br
${trendReason}

👉 [Посмотреть объявление](https://t.me/KetmarM_bot?startapp=ad_${ad._id})`;

    try {
      await sendMessageToTelegramId(twin.telegramId, message, { parse_mode: 'Markdown' });
      await this.addRecommendation(twin.telegramId, {
        adId: ad._id.toString(),
        type: 'trending',
        message: `Популярное: "${ad.title}" за ${ad.price?.toLocaleString()} Br`,
      });
    } catch (error) {
      console.error('[DigitalTwinNotification] notifyTrendingMatch error:', error);
    }
  }

  async sendDailySummary(twin) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentRecommendations = (twin.recommendations || []).filter(
      r => new Date(r.createdAt) >= yesterday && !r.isRead
    );

    if (recentRecommendations.length === 0) return;

    const newMatches = recentRecommendations.filter(r => r.type === 'new_match').length;
    const priceDrops = recentRecommendations.filter(r => r.type === 'price_drop').length;
    const nearby = recentRecommendations.filter(r => r.type === 'nearby').length;

    let summary = '📊 *Ваш ежедневный отчёт*\n\n';

    if (newMatches > 0) {
      summary += `✨ ${newMatches} новых совпадений по вашим желаниям\n`;
    }
    if (priceDrops > 0) {
      summary += `📉 ${priceDrops} снижений цен\n`;
    }
    if (nearby > 0) {
      summary += `📍 ${nearby} объявлений рядом\n`;
    }

    summary += '\n👉 [Открыть ассистента](https://t.me/KetmarM_bot?startapp=twin)';

    try {
      await sendMessageToTelegramId(twin.telegramId, summary, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[DigitalTwinNotification] sendDailySummary error:', error);
    }
  }
}

export default new DigitalTwinNotificationService();
