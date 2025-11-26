import Ad from '../models/Ad.js';
import SearchLog from '../models/SearchLog.js';
import DemandStats from '../models/DemandStats.js';
import Category from '../models/Category.js';
import ngeohash from 'ngeohash';

class FarmerNotificationService {
  static FARMER_KEYWORDS = [
    'малина', 'клубника', 'яблоки', 'груши', 'вишня', 'черешня', 'смородина',
    'крыжовник', 'голубика', 'ежевика', 'арбуз', 'дыня', 'виноград',
    'картошка', 'картофель', 'морковь', 'свекла', 'капуста', 'помидоры',
    'томаты', 'огурцы', 'лук', 'чеснок', 'перец', 'баклажан', 'кабачок',
    'укроп', 'петрушка', 'салат', 'щавель', 'шпинат', 'базилик', 'зелень',
    'молоко', 'сметана', 'творог', 'сыр', 'масло', 'кефир', 'йогурт',
    'яйца', 'курица', 'мясо', 'свинина', 'говядина', 'сало',
    'мёд', 'соты', 'прополис', 'перга',
    'выпечка', 'хлеб', 'пирожки', 'булочки', 'эклеры', 'торт',
    'варенье', 'джем', 'компот', 'соленья', 'грибы',
    'рассада', 'саженцы', 'семена',
  ];

  static async detectDemandSurge(lat, lng, radiusKm = 5) {
    const geoHash = ngeohash.encode(lat, lng, 5);
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const [currentDemand, previousDemand] = await Promise.all([
      SearchLog.aggregate([
        {
          $match: {
            createdAt: { $gte: last24h },
            geoHash: { $regex: `^${geoHash.substring(0, 4)}` },
          },
        },
        {
          $group: {
            _id: '$normalizedQuery',
            count: { $sum: 1 },
          },
        },
      ]),
      SearchLog.aggregate([
        {
          $match: {
            createdAt: { $gte: prev24h, $lt: last24h },
            geoHash: { $regex: `^${geoHash.substring(0, 4)}` },
          },
        },
        {
          $group: {
            _id: '$normalizedQuery',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const previousMap = new Map(previousDemand.map(d => [d._id, d.count]));
    const surges = [];

    for (const current of currentDemand) {
      const query = current._id?.toLowerCase() || '';
      const isFarmerRelated = this.FARMER_KEYWORDS.some(kw =>
        query.includes(kw) || kw.includes(query)
      );

      if (!isFarmerRelated) continue;

      const prevCount = previousMap.get(current._id) || 0;
      if (current.count >= 5 && prevCount > 0) {
        const growthPercent = ((current.count - prevCount) / prevCount) * 100;
        if (growthPercent >= 50) {
          surges.push({
            query: current._id,
            currentCount: current.count,
            previousCount: prevCount,
            growthPercent: Math.round(growthPercent),
          });
        }
      } else if (current.count >= 8 && prevCount === 0) {
        surges.push({
          query: current._id,
          currentCount: current.count,
          previousCount: 0,
          growthPercent: 100,
          isNew: true,
        });
      }
    }

    return surges.sort((a, b) => b.growthPercent - a.growthPercent);
  }

  static async detectMissingSupply(lat, lng, radiusKm = 5) {
    const geoHash = ngeohash.encode(lat, lng, 5);
    const now = new Date();
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const searches = await SearchLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last48h },
          geoHash: { $regex: `^${geoHash.substring(0, 4)}` },
          resultsCount: 0,
        },
      },
      {
        $group: {
          _id: '$normalizedQuery',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const missingItems = [];
    for (const search of searches) {
      const query = search._id?.toLowerCase() || '';
      const isFarmerRelated = this.FARMER_KEYWORDS.some(kw =>
        query.includes(kw) || kw.includes(query)
      );

      if (isFarmerRelated && search.count >= 3) {
        missingItems.push({
          query: search._id,
          searchCount: search.count,
        });
      }
    }

    return missingItems;
  }

  static async detectGoodPrice(sellerTelegramId) {
    const sellerAds = await Ad.find({
      sellerTelegramId,
      isFarmerAd: true,
      status: 'active',
    }).lean();

    const goodPriceAds = [];

    for (const ad of sellerAds) {
      const marketStats = await Ad.aggregate([
        {
          $match: {
            subcategoryId: ad.subcategoryId,
            isFarmerAd: true,
            status: 'active',
            _id: { $ne: ad._id },
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
          },
        },
      ]);

      const stats = marketStats[0];
      if (stats && stats.avgPrice > 0) {
        const diff = ((ad.price - stats.avgPrice) / stats.avgPrice) * 100;
        if (diff < -10) {
          goodPriceAds.push({
            ad,
            diffPercent: Math.round(diff),
            marketAvg: Math.round(stats.avgPrice * 100) / 100,
          });
        }
      }
    }

    return goodPriceAds;
  }

  static async detectNoViews(sellerTelegramId, hoursThreshold = 24) {
    const now = new Date();
    const threshold = new Date(now.getTime() - hoursThreshold * 60 * 60 * 1000);

    const noViewAds = await Ad.find({
      sellerTelegramId,
      isFarmerAd: true,
      status: 'active',
      createdAt: { $lt: threshold },
      $or: [
        { 'analytics.views': { $exists: false } },
        { 'analytics.views': 0 },
      ],
    }).lean();

    return noViewAds;
  }

  static async detectExpiringAds(sellerTelegramId, hoursThreshold = 24) {
    const now = new Date();
    const threshold = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

    const expiringAds = await Ad.find({
      sellerTelegramId,
      isFarmerAd: true,
      status: 'active',
      expiresAt: { $gt: now, $lte: threshold },
    }).lean();

    return expiringAds;
  }

  static async detectHighPriceAds(sellerTelegramId) {
    const sellerAds = await Ad.find({
      sellerTelegramId,
      isFarmerAd: true,
      status: 'active',
    }).lean();

    const highPriceAds = [];

    for (const ad of sellerAds) {
      const marketStats = await Ad.aggregate([
        {
          $match: {
            subcategoryId: ad.subcategoryId,
            isFarmerAd: true,
            status: 'active',
            _id: { $ne: ad._id },
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = marketStats[0];
      if (stats && stats.avgPrice > 0 && stats.count >= 3) {
        const diff = ((ad.price - stats.avgPrice) / stats.avgPrice) * 100;
        if (diff > 20) {
          highPriceAds.push({
            ad,
            diffPercent: Math.round(diff),
            marketAvg: Math.round(stats.avgPrice * 100) / 100,
            suggestedPrice: Math.round(stats.avgPrice * 1.1 * 100) / 100,
          });
        }
      }
    }

    return highPriceAds;
  }

  static async getAllNotifications(sellerTelegramId, lat, lng) {
    const notifications = [];

    const [
      demandSurges,
      missingSupply,
      goodPriceAds,
      noViewAds,
      expiringAds,
      highPriceAds,
    ] = await Promise.all([
      lat && lng ? this.detectDemandSurge(lat, lng) : [],
      lat && lng ? this.detectMissingSupply(lat, lng) : [],
      this.detectGoodPrice(sellerTelegramId),
      this.detectNoViews(sellerTelegramId),
      this.detectExpiringAds(sellerTelegramId),
      this.detectHighPriceAds(sellerTelegramId),
    ]);

    for (const surge of demandSurges.slice(0, 3)) {
      notifications.push({
        type: 'demand_surge',
        priority: 3,
        title: 'Спрос вырос',
        message: `Спрос на "${surge.query}" вырос на ${surge.growthPercent}% за сутки!`,
        action: 'publish',
        actionLabel: 'Опубликовать',
        data: surge,
      });
    }

    for (const missing of missingSupply.slice(0, 2)) {
      notifications.push({
        type: 'missing_supply',
        priority: 2,
        title: 'Нет предложений',
        message: `Рядом ищут "${missing.query}", но предложений нет. Хотите добавить?`,
        action: 'publish',
        actionLabel: 'Добавить товар',
        data: missing,
      });
    }

    for (const item of goodPriceAds.slice(0, 2)) {
      notifications.push({
        type: 'good_price',
        priority: 1,
        title: 'Отличная цена',
        message: `"${item.ad.title}" — у вас самая низкая цена (на ${Math.abs(item.diffPercent)}% ниже рынка)`,
        action: 'view',
        actionLabel: 'Посмотреть',
        data: { adId: item.ad._id, diffPercent: item.diffPercent },
      });
    }

    for (const ad of noViewAds.slice(0, 2)) {
      notifications.push({
        type: 'no_views',
        priority: 2,
        title: 'Нет просмотров',
        message: `"${ad.title}" никто не смотрел за 24 часа. Хотите изменить цену?`,
        action: 'edit',
        actionLabel: 'Редактировать',
        data: { adId: ad._id },
      });
    }

    for (const ad of expiringAds.slice(0, 2)) {
      const hoursLeft = Math.round(
        (new Date(ad.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
      );
      notifications.push({
        type: 'expiring_soon',
        priority: 3,
        title: 'Скоро исчезнет',
        message: `"${ad.title}" истекает через ${hoursLeft} ч.`,
        action: 'extend',
        actionLabel: 'Продлить',
        data: { adId: ad._id, hoursLeft },
      });
    }

    for (const item of highPriceAds.slice(0, 2)) {
      notifications.push({
        type: 'high_price',
        priority: 1,
        title: 'Цена выше рынка',
        message: `"${item.ad.title}" на ${item.diffPercent}% дороже рынка. Рекомендуем ${item.suggestedPrice} BYN`,
        action: 'edit',
        actionLabel: 'Изменить цену',
        data: { adId: item.ad._id, suggestedPrice: item.suggestedPrice },
      });
    }

    notifications.sort((a, b) => b.priority - a.priority);

    return notifications;
  }

  static formatTelegramMessage(notification) {
    const icons = {
      demand_surge: '📈',
      missing_supply: '🔍',
      good_price: '✅',
      no_views: '👁️',
      expiring_soon: '⏰',
      high_price: '💰',
    };

    const icon = icons[notification.type] || '📢';
    return `${icon} ${notification.title}\n\n${notification.message}`;
  }
}

export async function sendFarmerSuggestion(suggestion) {
  const { farmerTelegramId, message, productKey, demandInfo } = suggestion;
  
  if (!farmerTelegramId) {
    return { success: false, error: 'No telegram ID' };
  }
  
  try {
    const TelegramBotService = (await import('./TelegramBotService.js')).default;
    
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: 'Создать объявление',
            url: `https://t.me/KetmarM_bot?startapp=create_farmer_${productKey}`,
          },
        ],
        [
          {
            text: 'Посмотреть спрос в районе',
            url: 'https://t.me/KetmarM_bot?startapp=farmer_demand',
          },
        ],
      ],
    };
    
    const fullMessage = `🌾 *Подсказка для фермера*\n\n${message}\n\n📊 Статистика: ${demandInfo?.searches24h || 0} запросов за 24ч`;
    
    const result = await TelegramBotService.sendMessage(
      farmerTelegramId,
      fullMessage,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
    
    if (result && result.message_id) {
      console.log(`[FarmerNotification] Sent suggestion to ${farmerTelegramId}: ${productKey}`);
      return { success: true, messageId: result.message_id };
    }
    
    return { success: false, error: 'No message ID returned' };
  } catch (error) {
    console.error(`[FarmerNotification] Failed to send to ${farmerTelegramId}:`, error.message);
    
    if (error.message?.includes('blocked') || error.message?.includes('deactivated')) {
      return { success: false, error: 'User blocked bot' };
    }
    
    return { success: false, error: error.message };
  }
}

export async function sendDemandAlert(telegramId, demandData) {
  const { productKey, searches24h, trend, regionName } = demandData;
  
  try {
    const TelegramBotService = (await import('./TelegramBotService.js')).default;
    
    let trendEmoji = '➡️';
    if (trend === 'up') trendEmoji = '📈';
    if (trend === 'down') trendEmoji = '📉';
    
    const message = `${trendEmoji} *Спрос в вашем районе*\n\n` +
      `Товар: ${productKey}\n` +
      `Запросов за 24ч: ${searches24h}\n` +
      `Тренд: ${trend === 'up' ? 'растет' : trend === 'down' ? 'падает' : 'стабильный'}\n` +
      (regionName ? `Район: ${regionName}` : '');
    
    await TelegramBotService.sendMessage(telegramId, message, {
      parse_mode: 'Markdown',
    });
    
    return { success: true };
  } catch (error) {
    console.error(`[FarmerNotification] sendDemandAlert failed:`, error);
    return { success: false, error: error.message };
  }
}

export default FarmerNotificationService;
