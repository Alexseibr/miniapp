import SellerTwin from '../models/SellerTwin.js';
import User from '../models/User.js';
import SellerTwinEngine from './SellerTwinEngine.js';

let telegramNotifyCallback = null;

class SellerTwinNotificationService {
  setNotificationCallback(callback) {
    telegramNotifyCallback = callback;
  }

  async notifySellerOfIssue(sellerTelegramId, issue) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled || !twin?.settings?.notifyOnIssue) {
        return;
      }

      const severityEmoji = issue.severity > 0.7 ? '🔴' : issue.severity > 0.4 ? '🟡' : '🟢';
      const message = `${severityEmoji} *Проблема в объявлении*\n\n${issue.message}${issue.adTitle ? `\n\n📦 Товар: ${issue.adTitle}` : ''}${issue.actionRequired ? `\n\n💡 ${issue.actionRequired}` : ''}`;

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfIssue error:', error);
    }
  }

  async notifySellerOfOpportunity(sellerTelegramId, opportunity) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled || !twin?.settings?.notifyOnOpportunity) {
        return;
      }

      const typeEmoji = {
        'trending_category': '🔥',
        'high_demand': '📈',
        'low_competition': '🎯',
        'seasonal_peak': '🍓',
        'local_search': '📍',
      };

      const emoji = typeEmoji[opportunity.type] || '💡';
      const message = `${emoji} *Упущенная возможность*\n\n${opportunity.message}`;

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfOpportunity error:', error);
    }
  }

  async notifySellerOfDemandSpike(sellerTelegramId, data) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled || !twin?.settings?.notifyOnDemandSpike) {
        return;
      }

      const { categoryName, increasePercent, radius } = data;
      const message = `📈 *Спрос вырос!*\n\nКатегория "${categoryName}" получила +${increasePercent}% запросов${radius ? ` в радиусе ${radius} км` : ''}.\n\n💡 Отличное время для добавления товаров!`;

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfDemandSpike error:', error);
    }
  }

  async notifySellerOfCompetitor(sellerTelegramId, data) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled || !twin?.settings?.notifyOnCompetitor) {
        return;
      }

      const { categoryName, competitorCount, priceChange } = data;
      let message = `👀 *Новые конкуренты*\n\nВ категории "${categoryName}" появилось ${competitorCount} новых объявлений.`;

      if (priceChange) {
        message += `\n\nСредняя цена ${priceChange > 0 ? 'выросла' : 'упала'} на ${Math.abs(priceChange)}%.`;
      }

      message += '\n\n💡 Проверьте свои цены и описания!';

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfCompetitor error:', error);
    }
  }

  async notifySellerOfPeakTime(sellerTelegramId) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled) {
        return;
      }

      const message = `⏰ *Пиковая активность покупателей!*\n\nСейчас лучшее время для публикации новых товаров.\n\n💡 Добавьте объявление прямо сейчас!`;

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfPeakTime error:', error);
    }
  }

  async notifySellerOfPriceOpportunity(sellerTelegramId, data) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled) {
        return;
      }

      const { adTitle, currentPrice, recommendedPrice, reason } = data;
      const diff = recommendedPrice - currentPrice;
      const diffPercent = Math.round((diff / currentPrice) * 100);
      const direction = diff > 0 ? 'поднять' : 'снизить';

      const message = `💰 *Рекомендация по цене*\n\n📦 ${adTitle}\n\nМожете ${direction} цену на ${Math.abs(diffPercent)}%${reason ? `\n\n📊 ${reason}` : ''}\n\n💡 Рекомендуемая цена: ${recommendedPrice} руб`;

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfPriceOpportunity error:', error);
    }
  }

  async notifySellerOfDyingListing(sellerTelegramId, data) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled) {
        return;
      }

      const { adTitle, daysSinceLastView, suggestions } = data;
      let message = `⚠️ *Объявление "умирает"*\n\n📦 ${adTitle}\n\nНет просмотров уже ${daysSinceLastView} дней.`;

      if (suggestions?.length) {
        message += `\n\n💡 Рекомендации:\n${suggestions.map(s => `• ${s}`).join('\n')}`;
      }

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] notifySellerOfDyingListing error:', error);
    }
  }

  async sendDailySummary(sellerTelegramId) {
    try {
      const twin = await SellerTwin.findOne({ sellerTelegramId });
      if (!twin?.settings?.notificationsEnabled) {
        return;
      }

      const overview = await SellerTwinEngine.getOverview(sellerTelegramId);

      const unresolvedIssues = overview.issues.filter(i => !i.isResolved).length;
      const unreadRecs = overview.recommendations.filter(r => !r.isRead).length;
      const opportunities = overview.missedOpportunities.length;

      if (unresolvedIssues === 0 && unreadRecs === 0 && opportunities === 0) {
        return;
      }

      let message = `📊 *Ежедневный отчёт Digital Twin*\n\n`;
      message += `📦 Активных объявлений: ${overview.stats.activeAds}\n`;
      message += `⭐ Качество: ${overview.stats.avgQualityScore}%\n`;

      if (unresolvedIssues > 0) {
        message += `\n⚠️ Проблем: ${unresolvedIssues}`;
      }

      if (unreadRecs > 0) {
        message += `\n💡 Новых рекомендаций: ${unreadRecs}`;
      }

      if (opportunities > 0) {
        message += `\n🔥 Упущенных возможностей: ${opportunities}`;
      }

      message += '\n\n👉 Откройте Digital Twin для подробностей';

      await this.sendNotification(sellerTelegramId, message);
    } catch (error) {
      console.error('[SellerTwinNotification] sendDailySummary error:', error);
    }
  }

  async sendNotification(telegramId, message) {
    if (telegramNotifyCallback) {
      await telegramNotifyCallback(telegramId, message, 'seller_twin');
    } else {
      console.log(`[SellerTwinNotification] Would send to ${telegramId}:`, message);
    }
  }
}

export default new SellerTwinNotificationService();
