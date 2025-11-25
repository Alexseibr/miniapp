import FarmerSubscription from '../models/FarmerSubscription.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';

class MonetizationService {
  static TIERS = {
    free: {
      name: 'Базовый',
      nameEn: 'Free',
      price: 0,
      currency: 'BYN',
      features: [
        '1 товар в витрине',
        'Базовые карточки',
        'Стандартная видимость',
      ],
      limits: {
        showcaseAds: 1,
        autoBoostHours: null,
        premiumCards: false,
        seasonalAccess: false,
      },
    },
    pro: {
      name: 'PRO',
      nameEn: 'Pro',
      price: 0.99,
      currency: 'BYN',
      features: [
        '5 товаров в витрине',
        'Авто-поднятие каждые 48ч',
        'Подробная аналитика',
        'Приоритет в ленте',
      ],
      limits: {
        showcaseAds: 5,
        autoBoostHours: 48,
        premiumCards: false,
        seasonalAccess: false,
      },
    },
    max: {
      name: 'MAX',
      nameEn: 'Max',
      price: 2.49,
      currency: 'BYN',
      features: [
        '20 товаров в витрине',
        'Авто-поднятие каждые 24ч',
        'Премиум-карточки',
        'Место в сезонной ярмарке',
        'Приоритетная поддержка',
        'Полная аналитика',
      ],
      limits: {
        showcaseAds: 20,
        autoBoostHours: 24,
        premiumCards: true,
        seasonalAccess: true,
      },
    },
  };

  static async getOrCreateSubscription(telegramId) {
    let subscription = await FarmerSubscription.findOne({ 
      telegramId, 
      status: 'active' 
    });

    if (!subscription) {
      const user = await User.findOne({ telegramId });
      subscription = await FarmerSubscription.create({
        userId: user?._id,
        telegramId,
        tier: 'free',
        status: 'active',
        features: FarmerSubscription.getTierFeatures('free'),
        pricing: { monthlyPrice: 0, currency: 'BYN' },
      });
    }

    return subscription;
  }

  static async getCurrentTier(telegramId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    return {
      tier: subscription.tier,
      features: this.TIERS[subscription.tier],
      subscription,
    };
  }

  static async upgradeTier(telegramId, newTier) {
    if (!this.TIERS[newTier]) {
      throw new Error('Invalid tier');
    }

    const subscription = await this.getOrCreateSubscription(telegramId);
    const tierData = this.TIERS[newTier];
    const tierFeatures = FarmerSubscription.getTierFeatures(newTier);

    subscription.tier = newTier;
    subscription.status = 'active';
    subscription.features = tierFeatures;
    subscription.pricing = {
      monthlyPrice: tierData.price,
      currency: tierData.currency,
    };
    subscription.billing.startDate = new Date();
    subscription.billing.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    await subscription.save();
    return subscription;
  }

  static async canUsePremiumCards(telegramId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    return subscription.features.premiumCards;
  }

  static async canAccessSeasonal(telegramId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    return subscription.features.seasonalAccess;
  }

  static async getShowcaseLimit(telegramId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    return subscription.features.maxShowcaseAds;
  }

  static async boostAd(telegramId, adId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    
    if (!subscription.canBoost()) {
      const tierFeatures = this.TIERS[subscription.tier];
      if (subscription.tier === 'free') {
        return { 
          success: false, 
          error: 'Поднятие доступно только для PRO и MAX подписок',
          requiredTier: 'pro',
        };
      }
      
      const hoursLeft = subscription.boosts.lastBoostAt
        ? Math.ceil((tierFeatures.limits.autoBoostHours - 
            (Date.now() - subscription.boosts.lastBoostAt.getTime()) / (1000 * 60 * 60)))
        : 0;
        
      return {
        success: false,
        error: `Следующее поднятие доступно через ${hoursLeft} ч.`,
        hoursLeft,
      };
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return { success: false, error: 'Объявление не найдено' };
    }

    if (String(ad.sellerTelegramId) !== String(telegramId)) {
      return { success: false, error: 'Это не ваше объявление' };
    }

    await subscription.useBoost();
    
    ad.boostedAt = new Date();
    ad.boostLevel = (ad.boostLevel || 0) + 1;
    await ad.save();

    return {
      success: true,
      message: 'Объявление поднято в ленте',
      nextBoostIn: this.TIERS[subscription.tier].limits.autoBoostHours,
    };
  }

  static async enablePremiumCard(telegramId, adId) {
    const canUse = await this.canUsePremiumCards(telegramId);
    if (!canUse) {
      return {
        success: false,
        error: 'Премиум-карточки доступны только для MAX подписки',
        requiredTier: 'max',
      };
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return { success: false, error: 'Объявление не найдено' };
    }

    if (String(ad.sellerTelegramId) !== String(telegramId)) {
      return { success: false, error: 'Это не ваше объявление' };
    }

    ad.isPremiumCard = true;
    ad.premiumBadge = 'gold';
    await ad.save();

    return {
      success: true,
      message: 'Премиум-карточка активирована',
    };
  }

  static async getSubscriptionStats(telegramId) {
    const subscription = await this.getOrCreateSubscription(telegramId);
    const ads = await Ad.countDocuments({ 
      sellerTelegramId: telegramId, 
      status: 'active',
      isFarmerAd: true,
    });
    
    const premiumAds = await Ad.countDocuments({
      sellerTelegramId: telegramId,
      status: 'active',
      isPremiumCard: true,
    });

    return {
      subscription: {
        tier: subscription.tier,
        status: subscription.status,
        features: this.TIERS[subscription.tier],
        billing: subscription.billing,
      },
      usage: {
        activeAds: ads,
        premiumAds,
        showcaseLimit: subscription.features.maxShowcaseAds,
        showcaseUsed: Math.min(ads, subscription.features.maxShowcaseAds),
        boostsUsed: subscription.boosts.used,
        canBoost: subscription.canBoost(),
      },
      stats: subscription.stats,
    };
  }

  static getAllTiers() {
    return Object.entries(this.TIERS).map(([key, value]) => ({
      id: key,
      ...value,
    }));
  }
}

export default MonetizationService;
