import cron from 'node-cron';
import Ad from '../models/Ad.js';
import User from '../models/User.js';
import DynamicPriceEngine from '../services/DynamicPriceEngine.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';

const PRICE_CHANGE_THRESHOLD = 10;
const DEMAND_SPIKE_THRESHOLD = 1.15;
const COMPETITION_DROP_THRESHOLD = 1.1;

class PriceWatcher {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.priceAlerts = new Map();
  }

  start() {
    cron.schedule('*/10 * * * *', () => this.runCheck());
    
    cron.schedule('0 9,14,19 * * *', () => this.sendDailyPriceAlerts());
    
    console.log('[PriceWatcher] Started - price checks every 10 minutes');
    console.log('[PriceWatcher] Daily alerts at 9:00, 14:00, 19:00');
  }

  async runCheck() {
    if (this.isRunning) {
      console.log('[PriceWatcher] Previous check still running, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      console.log('[PriceWatcher] Starting price check...');

      const activeAds = await Ad.find({
        status: 'active',
        moderationStatus: 'approved',
        price: { $gt: 0 },
      })
        .select('_id sellerTelegramId title price categoryId location')
        .limit(500)
        .lean();

      console.log(`[PriceWatcher] Checking ${activeAds.length} ads...`);

      let alertsGenerated = 0;

      for (const ad of activeAds) {
        try {
          const priceData = await DynamicPriceEngine.calculatePrice(ad);
          
          if (!priceData.success || !priceData.hasMarketData) continue;

          const alerts = this.analyzeForAlerts(ad, priceData);
          
          if (alerts.length > 0) {
            await this.queueAlerts(ad.sellerTelegramId, ad._id.toString(), alerts);
            alertsGenerated += alerts.length;
          }
        } catch (error) {
          console.error(`[PriceWatcher] Error processing ad ${ad._id}:`, error.message);
        }
      }

      console.log(`[PriceWatcher] Check complete. Alerts generated: ${alertsGenerated}`);
    } catch (error) {
      console.error('[PriceWatcher] runCheck error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  analyzeForAlerts(ad, priceData) {
    const alerts = [];

    if (priceData.diffPercent > 20) {
      alerts.push({
        type: 'price_too_high',
        severity: 'warning',
        message: `Цена "${ad.title}" выше рынка на ${Math.round(priceData.diffPercent)}%`,
        detail: `Рекомендуем: ${priceData.recommended} Br`,
        adId: ad._id.toString(),
      });
    }

    if (priceData.diffPercent < -15 && priceData.factors?.demandScore >= 1.0) {
      alerts.push({
        type: 'price_too_low',
        severity: 'info',
        message: `💰 "${ad.title}" можно продать дороже`,
        detail: `Ваша цена на ${Math.abs(Math.round(priceData.diffPercent))}% ниже рынка`,
        adId: ad._id.toString(),
      });
    }

    if (priceData.factors?.demandScore >= DEMAND_SPIKE_THRESHOLD && priceData.position !== 'high') {
      alerts.push({
        type: 'demand_spike',
        severity: 'opportunity',
        message: `🔥 Спрос на "${ad.title}" вырос!`,
        detail: 'Можно поднять цену на 10-15%',
        adId: ad._id.toString(),
      });
    }

    if (priceData.factors?.competitionFactor >= COMPETITION_DROP_THRESHOLD) {
      alerts.push({
        type: 'low_competition',
        severity: 'opportunity',
        message: `📈 Мало конкурентов для "${ad.title}"`,
        detail: 'Хорошее время для повышения цены',
        adId: ad._id.toString(),
      });
    }

    for (const impulse of priceData.impulseRecommendations || []) {
      if (impulse.urgency === 'high') {
        alerts.push({
          type: 'impulse',
          severity: 'urgent',
          message: impulse.message,
          detail: `Товар: ${ad.title}`,
          adId: ad._id.toString(),
        });
      }
    }

    return alerts;
  }

  async queueAlerts(telegramId, adId, alerts) {
    const key = `${telegramId}:${adId}`;
    const existing = this.priceAlerts.get(key) || [];
    
    const newAlerts = alerts.filter(alert => {
      const isDuplicate = existing.some(e => 
        e.type === alert.type && 
        Date.now() - e.timestamp < 24 * 60 * 60 * 1000
      );
      return !isDuplicate;
    });

    if (newAlerts.length === 0) return;

    const timestamped = newAlerts.map(a => ({ ...a, timestamp: Date.now() }));
    this.priceAlerts.set(key, [...existing, ...timestamped].slice(-10));
  }

  async sendDailyPriceAlerts() {
    console.log('[PriceWatcher] Sending daily price alerts...');

    const groupedAlerts = new Map();

    for (const [key, alerts] of this.priceAlerts.entries()) {
      const [telegramId] = key.split(':');
      
      const recentAlerts = alerts.filter(a => 
        Date.now() - a.timestamp < 24 * 60 * 60 * 1000 && !a.sent
      );

      if (recentAlerts.length === 0) continue;

      if (!groupedAlerts.has(telegramId)) {
        groupedAlerts.set(telegramId, []);
      }
      groupedAlerts.get(telegramId).push(...recentAlerts);
    }

    for (const [telegramId, alerts] of groupedAlerts.entries()) {
      try {
        const message = this.formatAlertMessage(alerts);
        await sendMessageToTelegramId(Number(telegramId), message, { parse_mode: 'Markdown' });

        for (const alert of alerts) {
          alert.sent = true;
        }

        console.log(`[PriceWatcher] Sent ${alerts.length} alerts to ${telegramId}`);
      } catch (error) {
        console.error(`[PriceWatcher] Failed to send alerts to ${telegramId}:`, error.message);
      }
    }
  }

  formatAlertMessage(alerts) {
    const urgent = alerts.filter(a => a.severity === 'urgent' || a.severity === 'opportunity');
    const warnings = alerts.filter(a => a.severity === 'warning');
    const info = alerts.filter(a => a.severity === 'info');

    let message = '📊 *Ценовая аналитика*\n\n';

    if (urgent.length > 0) {
      message += '🔥 *Важные возможности:*\n';
      for (const alert of urgent.slice(0, 3)) {
        message += `• ${alert.message}\n  _${alert.detail}_\n`;
      }
      message += '\n';
    }

    if (warnings.length > 0) {
      message += '⚠️ *Рекомендации:*\n';
      for (const alert of warnings.slice(0, 3)) {
        message += `• ${alert.message}\n  _${alert.detail}_\n`;
      }
      message += '\n';
    }

    if (info.length > 0) {
      message += '💡 *Подсказки:*\n';
      for (const alert of info.slice(0, 2)) {
        message += `• ${alert.message}\n`;
      }
      message += '\n';
    }

    message += '👉 [Открыть аналитику цен](https://t.me/KetmarM_bot?startapp=dynamic-price)';

    return message;
  }

  async sendImmediateAlert(telegramId, alert) {
    try {
      let emoji = '📊';
      switch (alert.severity) {
        case 'urgent': emoji = '🔥'; break;
        case 'opportunity': emoji = '💰'; break;
        case 'warning': emoji = '⚠️'; break;
        case 'info': emoji = '💡'; break;
      }

      const message = `${emoji} *${alert.message}*\n\n${alert.detail}\n\n👉 [Подробнее](https://t.me/KetmarM_bot?startapp=ad_${alert.adId})`;

      await sendMessageToTelegramId(Number(telegramId), message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[PriceWatcher] sendImmediateAlert error:', error);
    }
  }

  async checkMarketChanges(categoryId, lat, lng) {
    try {
      const trend = await DynamicPriceEngine.getMarketTrend(categoryId, lat, lng, 1);

      if (trend.changePercent >= 10 || trend.changePercent <= -10) {
        return {
          hasSignificantChange: true,
          trend: trend.trend,
          changePercent: trend.changePercent,
          message: trend.trend === 'rising' 
            ? `📈 Цены выросли на ${trend.changePercent}%` 
            : `📉 Цены упали на ${Math.abs(trend.changePercent)}%`,
        };
      }

      return { hasSignificantChange: false };
    } catch (error) {
      console.error('[PriceWatcher] checkMarketChanges error:', error);
      return { hasSignificantChange: false };
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      alertsQueued: this.priceAlerts.size,
    };
  }
}

export default new PriceWatcher();
