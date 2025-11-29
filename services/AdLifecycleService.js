import Ad from '../models/Ad.js';
import CategoryLifetimeConfig from '../models/CategoryLifetimeConfig.js';

const DEFAULT_CONFIGS = {
  perishable_daily: { defaultTtlDays: 1, remindBeforeExpireDays: null, remindMidLifetime: false, allowDailyRepeat: true },
  fast: { defaultTtlDays: 7, remindBeforeExpireDays: 1, remindMidLifetime: false, allowDailyRepeat: false },
  medium: { defaultTtlDays: 14, remindBeforeExpireDays: 2, remindMidLifetime: false, allowDailyRepeat: false },
  long: { defaultTtlDays: 30, remindBeforeExpireDays: 3, remindMidLifetime: true, allowDailyRepeat: false },
};

const CATEGORY_LIFETIME_MAP = {
  'farmer-market': 'perishable_daily',
  'bakery': 'perishable_daily',
  'vegetables': 'perishable_daily',
  'fruits': 'perishable_daily',
  'berries': 'perishable_daily',
  'greens': 'perishable_daily',
  'dairy': 'perishable_daily',
  'meat': 'perishable_daily',
  'honey': 'fast',
  'preserves': 'fast',
  
  'electronics': 'fast',
  'phones': 'fast',
  'computers': 'fast',
  'tablets': 'fast',
  'accessories': 'fast',
  'clothing': 'fast',
  'shoes': 'fast',
  'kids': 'fast',
  'sports': 'fast',
  'beauty': 'fast',
  'pets': 'fast',
  'garden': 'fast',
  'household': 'fast',
  
  'auto': 'medium',
  'cars': 'medium',
  'motorcycles': 'medium',
  'parts': 'medium',
  'tires': 'medium',
  'bicycles': 'medium',
  'furniture': 'medium',
  'appliances': 'medium',
  'tools': 'medium',
  
  'realty': 'long',
  'apartments': 'long',
  'houses': 'long',
  'land': 'long',
  'commercial': 'long',
  'rent': 'medium',
};

class AdLifecycleService {
  static async getLifetimeConfig(categoryId) {
    try {
      const config = await CategoryLifetimeConfig.findOne({ categoryId }).lean();
      if (config) return config;
      
      const lifetimeType = CATEGORY_LIFETIME_MAP[categoryId] || 'fast';
      return {
        categoryId,
        lifetimeType,
        ...DEFAULT_CONFIGS[lifetimeType],
      };
    } catch (error) {
      console.error('[AdLifecycleService] Error getting lifetime config:', error);
      return {
        categoryId,
        lifetimeType: 'fast',
        ...DEFAULT_CONFIGS.fast,
      };
    }
  }

  static async setExpiresAtOnCreate(ad) {
    const config = await this.getLifetimeConfig(ad.categoryId);
    
    ad.lifetimeType = config.lifetimeType;
    
    const now = new Date();
    
    if (ad.scheduledAt && new Date(ad.scheduledAt) > now) {
      ad.status = 'scheduled';
      ad.expiresAt = null;
    } else if (ad.repeatMode === 'daily' && config.allowDailyRepeat) {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      ad.expiresAt = endOfDay;
      ad.status = 'active';
    } else {
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + config.defaultTtlDays);
      ad.expiresAt = expiresAt;
      ad.status = 'active';
    }
    
    return ad;
  }

  static async extendAd(adId, userId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Объявление не найдено');
    }
    
    if (ad.sellerTelegramId !== userId) {
      throw new Error('Нет прав на продление объявления');
    }
    
    const config = await this.getLifetimeConfig(ad.categoryId);
    
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + config.defaultTtlDays);
    
    ad.expiresAt = expiresAt;
    ad.status = 'active';
    ad.reminderSentAt = null;
    ad.midLifeReminderSent = false;
    
    await ad.save();
    
    return ad;
  }

  static async archiveAd(adId, userId) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Объявление не найдено');
    }
    
    if (ad.sellerTelegramId !== userId) {
      throw new Error('Нет прав на архивирование объявления');
    }
    
    ad.status = 'archived';
    await ad.save();
    
    return ad;
  }

  static async markSoldOut(adId, userId, isSoldOut = true) {
    const ad = await Ad.findById(adId);
    if (!ad) {
      throw new Error('Объявление не найдено');
    }
    
    if (ad.sellerTelegramId !== userId) {
      throw new Error('Нет прав на изменение объявления');
    }
    
    ad.isSoldOut = isSoldOut;
    if (isSoldOut) {
      ad.status = 'sold';
    }
    
    await ad.save();
    
    return ad;
  }

  static async processExpiredAds() {
    const now = new Date();
    
    const expiredAds = await Ad.find({
      status: 'active',
      expiresAt: { $lte: now },
      isTemplate: { $ne: true },
    }).limit(100);
    
    const results = [];
    
    for (const ad of expiredAds) {
      try {
        ad.status = 'expired';
        await ad.save();
        
        results.push({
          adId: ad._id,
          sellerId: ad.sellerTelegramId,
          title: ad.title,
          action: 'expired',
        });
      } catch (error) {
        console.error(`[AdLifecycleService] Error expiring ad ${ad._id}:`, error);
      }
    }
    
    return results;
  }

  static async processScheduledAds() {
    const now = new Date();
    
    const scheduledAds = await Ad.find({
      status: 'scheduled',
      scheduledAt: { $lte: now },
    }).limit(100);
    
    const results = [];
    
    for (const ad of scheduledAds) {
      try {
        const config = await this.getLifetimeConfig(ad.categoryId);
        
        if (ad.repeatMode === 'daily' && config.allowDailyRepeat) {
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          ad.expiresAt = endOfDay;
        } else {
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + config.defaultTtlDays);
          ad.expiresAt = expiresAt;
        }
        
        ad.status = 'active';
        await ad.save();
        
        results.push({
          adId: ad._id,
          sellerId: ad.sellerTelegramId,
          title: ad.title,
          action: 'activated',
        });
      } catch (error) {
        console.error(`[AdLifecycleService] Error activating scheduled ad ${ad._id}:`, error);
      }
    }
    
    return results;
  }

  static async processDailyAds() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    const dailyTemplates = await Ad.find({
      repeatMode: 'daily',
      isTemplate: true,
      $or: [
        { repeatUntil: null },
        { repeatUntil: { $gte: now } },
      ],
    }).limit(100);
    
    const results = [];
    
    for (const template of dailyTemplates) {
      try {
        const existingToday = await Ad.findOne({
          templateId: template._id,
          createdAt: { $gte: startOfToday },
        });
        
        if (existingToday) {
          continue;
        }
        
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        
        const newAd = new Ad({
          ...template.toObject(),
          _id: undefined,
          templateId: template._id,
          isTemplate: false,
          status: 'active',
          expiresAt: endOfDay,
          createdAt: undefined,
          updatedAt: undefined,
          views: 0,
          viewsTotal: 0,
          viewsToday: 0,
          impressionsTotal: 0,
          impressionsToday: 0,
          contactClicks: 0,
          favoritesCount: 0,
        });
        
        await newAd.save();
        
        results.push({
          adId: newAd._id,
          templateId: template._id,
          sellerId: template.sellerTelegramId,
          title: template.title,
          action: 'daily_created',
        });
      } catch (error) {
        console.error(`[AdLifecycleService] Error creating daily ad from template ${template._id}:`, error);
      }
    }
    
    await Ad.updateMany(
      {
        templateId: { $exists: true, $ne: null },
        status: 'active',
        expiresAt: { $lt: startOfToday },
      },
      { status: 'expired' }
    );
    
    return results;
  }

  static async processReminders() {
    const now = new Date();
    const results = [];
    
    const adsNeedingReminder = await Ad.aggregate([
      {
        $match: {
          status: 'active',
          expiresAt: { $ne: null },
          reminderSentAt: null,
          isTemplate: { $ne: true },
        },
      },
      {
        $lookup: {
          from: 'categorylifetimeconfigs',
          localField: 'categoryId',
          foreignField: 'categoryId',
          as: 'config',
        },
      },
      {
        $addFields: {
          config: { $arrayElemAt: ['$config', 0] },
        },
      },
      {
        $addFields: {
          remindDays: { $ifNull: ['$config.remindBeforeExpireDays', 1] },
        },
      },
      {
        $addFields: {
          remindThreshold: {
            $subtract: ['$expiresAt', { $multiply: ['$remindDays', 24 * 60 * 60 * 1000] }],
          },
        },
      },
      {
        $match: {
          $expr: { $lte: ['$remindThreshold', now] },
        },
      },
      { $limit: 50 },
    ]);
    
    for (const ad of adsNeedingReminder) {
      try {
        await Ad.updateOne(
          { _id: ad._id },
          { reminderSentAt: now }
        );
        
        const daysLeft = Math.ceil((new Date(ad.expiresAt) - now) / (24 * 60 * 60 * 1000));
        
        results.push({
          adId: ad._id,
          sellerId: ad.sellerTelegramId,
          title: ad.title,
          action: 'reminder',
          daysLeft,
        });
      } catch (error) {
        console.error(`[AdLifecycleService] Error sending reminder for ad ${ad._id}:`, error);
      }
    }
    
    return results;
  }

  static async processMidLifeReminders() {
    const now = new Date();
    const results = [];
    
    const longAds = await Ad.find({
      status: 'active',
      lifetimeType: 'long',
      expiresAt: { $ne: null },
      midLifeReminderSent: false,
      isTemplate: { $ne: true },
    }).limit(50);
    
    for (const ad of longAds) {
      try {
        const createdAt = ad.createdAt || ad._id.getTimestamp();
        const expiresAt = new Date(ad.expiresAt);
        const totalDays = (expiresAt - createdAt) / (24 * 60 * 60 * 1000);
        const midPoint = new Date(createdAt.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000);
        
        if (now >= midPoint) {
          await Ad.updateOne(
            { _id: ad._id },
            { midLifeReminderSent: true }
          );
          
          results.push({
            adId: ad._id,
            sellerId: ad.sellerTelegramId,
            title: ad.title,
            action: 'mid_life_reminder',
          });
        }
      } catch (error) {
        console.error(`[AdLifecycleService] Error sending mid-life reminder for ad ${ad._id}:`, error);
      }
    }
    
    return results;
  }

  static async seedDefaultConfigs() {
    const configs = [
      { categoryId: 'farmer-market', lifetimeType: 'perishable_daily', defaultTtlDays: 1, remindBeforeExpireDays: null, remindMidLifetime: false, allowDailyRepeat: true, description: 'Фермерский рынок - ежедневные товары' },
      { categoryId: 'bakery', lifetimeType: 'perishable_daily', defaultTtlDays: 1, remindBeforeExpireDays: null, remindMidLifetime: false, allowDailyRepeat: true, description: 'Выпечка - ежедневная продукция' },
      { categoryId: 'electronics', lifetimeType: 'fast', defaultTtlDays: 7, remindBeforeExpireDays: 1, remindMidLifetime: false, allowDailyRepeat: false, description: 'Электроника - быстрые продажи' },
      { categoryId: 'clothing', lifetimeType: 'fast', defaultTtlDays: 7, remindBeforeExpireDays: 1, remindMidLifetime: false, allowDailyRepeat: false, description: 'Одежда - быстрые продажи' },
      { categoryId: 'auto', lifetimeType: 'medium', defaultTtlDays: 14, remindBeforeExpireDays: 2, remindMidLifetime: false, allowDailyRepeat: false, description: 'Авто - средний срок' },
      { categoryId: 'furniture', lifetimeType: 'medium', defaultTtlDays: 14, remindBeforeExpireDays: 2, remindMidLifetime: false, allowDailyRepeat: false, description: 'Мебель - средний срок' },
      { categoryId: 'realty', lifetimeType: 'long', defaultTtlDays: 30, remindBeforeExpireDays: 3, remindMidLifetime: true, allowDailyRepeat: false, description: 'Недвижимость - долгий срок' },
    ];
    
    for (const config of configs) {
      await CategoryLifetimeConfig.findOneAndUpdate(
        { categoryId: config.categoryId },
        config,
        { upsert: true, new: true }
      );
    }
    
    console.log('[AdLifecycleService] Default configs seeded');
  }
}

export default AdLifecycleService;
