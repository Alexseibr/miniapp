import SearchLog from '../models/SearchLog.js';
import Ad from '../models/Ad.js';
import User from '../models/User.js';

const DEMAND_THRESHOLD = 3;
const SPIKE_MULTIPLIER = 2;

class FarmerTipsService {
  async getDemandByRegion(regionId, hours = 24) {
    return SearchLog.getHotFarmerProducts({ regionId, hours, limit: 20 });
  }

  async getBulkSpikes(keywords, regionId, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const previousPeriod = new Date(since.getTime() - hours * 60 * 60 * 1000);
    
    const matchCurrent = {
      isFarmerSearch: true,
      matchedFarmerKeywords: { $in: keywords },
      createdAt: { $gte: since },
    };
    if (regionId) matchCurrent.regionId = regionId;
    
    const matchPrevious = {
      isFarmerSearch: true,
      matchedFarmerKeywords: { $in: keywords },
      createdAt: { $gte: previousPeriod, $lt: since },
    };
    if (regionId) matchPrevious.regionId = regionId;
    
    const [currentCounts, previousCounts] = await Promise.all([
      SearchLog.aggregate([
        { $match: matchCurrent },
        { $unwind: '$matchedFarmerKeywords' },
        { $match: { matchedFarmerKeywords: { $in: keywords } } },
        { $group: { _id: '$matchedFarmerKeywords', count: { $sum: 1 } } },
      ]),
      SearchLog.aggregate([
        { $match: matchPrevious },
        { $unwind: '$matchedFarmerKeywords' },
        { $match: { matchedFarmerKeywords: { $in: keywords } } },
        { $group: { _id: '$matchedFarmerKeywords', count: { $sum: 1 } } },
      ]),
    ]);
    
    const currentMap = new Map(currentCounts.map(c => [c._id, c.count]));
    const previousMap = new Map(previousCounts.map(c => [c._id, c.count]));
    
    const results = {};
    for (const keyword of keywords) {
      const current = currentMap.get(keyword) || 0;
      const previous = previousMap.get(keyword) || 0;
      
      const isSpike = current >= DEMAND_THRESHOLD && 
                      (previous === 0 || current >= previous * SPIKE_MULTIPLIER);
      
      results[keyword] = {
        currentCount: current,
        previousCount: previous,
        isSpike,
        growth: previous > 0 ? ((current - previous) / previous * 100).toFixed(0) : null,
      };
    }
    
    return results;
  }

  async getBulkSupply(keywords, regionId = null) {
    const regexConditions = keywords.map(k => ({
      $or: [
        { title: { $regex: k, $options: 'i' } },
        { description: { $regex: k, $options: 'i' } },
      ],
    }));
    
    const matchStage = {
      status: 'active',
      moderationStatus: 'approved',
      $or: regexConditions,
    };
    
    if (regionId) {
      matchStage.regionId = regionId;
    }
    
    const counts = await Ad.aggregate([
      { $match: matchStage },
      {
        $project: {
          matchedKeyword: {
            $filter: {
              input: keywords,
              as: 'keyword',
              cond: {
                $or: [
                  { $regexMatch: { input: { $ifNull: ['$title', ''] }, regex: '$$keyword', options: 'i' } },
                  { $regexMatch: { input: { $ifNull: ['$description', ''] }, regex: '$$keyword', options: 'i' } },
                ],
              },
            },
          },
        },
      },
      { $unwind: '$matchedKeyword' },
      { $group: { _id: '$matchedKeyword', count: { $sum: 1 } } },
    ]);
    
    const supplyMap = {};
    for (const keyword of keywords) {
      supplyMap[keyword] = 0;
    }
    for (const item of counts) {
      supplyMap[item._id] = item.count;
    }
    
    return supplyMap;
  }

  async generateFarmerTips(options = {}) {
    const { regionId, hours = 24 } = options;
    
    const hotProducts = await this.getDemandByRegion(regionId, hours);
    
    if (hotProducts.length === 0) return [];
    
    const keywords = hotProducts.map(p => p.keyword);
    
    const [supplyMap, spikesMap] = await Promise.all([
      this.getBulkSupply(keywords, regionId),
      this.getBulkSpikes(keywords, regionId, hours),
    ]);
    
    const tips = [];
    
    for (const product of hotProducts) {
      const supply = supplyMap[product.keyword] || 0;
      const spike = spikesMap[product.keyword] || { isSpike: false, growth: null };
      
      const demandSupplyRatio = supply > 0 ? product.searchCount / supply : product.searchCount;
      
      if (demandSupplyRatio >= 1.5 || supply === 0) {
        tips.push({
          keyword: product.keyword,
          searchCount: product.searchCount,
          uniqueUsers: product.uniqueUsersCount,
          currentSupply: supply,
          demandSupplyRatio: demandSupplyRatio.toFixed(1),
          isSpike: spike.isSpike,
          growth: spike.growth,
          priority: this.calculatePriority(product.searchCount, supply, spike.isSpike),
          message: this.generateMessage(product.keyword, product.searchCount, supply, spike.isSpike),
        });
      }
    }
    
    tips.sort((a, b) => b.priority - a.priority);
    
    return tips.slice(0, 5);
  }

  calculatePriority(searchCount, supply, isSpike) {
    let priority = searchCount * 10;
    
    if (supply === 0) {
      priority *= 2;
    } else {
      priority *= (1 + searchCount / supply);
    }
    
    if (isSpike) {
      priority *= 1.5;
    }
    
    return Math.round(priority);
  }

  generateMessage(keyword, searchCount, supply, isSpike) {
    const productName = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    
    if (supply === 0) {
      return `🔥 В вашем районе ищут "${productName}" (${searchCount} запросов), но предложений пока нет! Разместите объявление первым.`;
    }
    
    if (isSpike) {
      return `📈 Спрос на "${productName}" резко вырос! ${searchCount} запросов за последние сутки. Сейчас хорошее время для размещения.`;
    }
    
    return `💡 В вашем районе активно ищут "${productName}" — ${searchCount} запросов. Всего ${supply} предложений на рынке.`;
  }

  async getFarmersToNotify(regionId) {
    const farmers = await User.find({
      'subscription.plan': { $in: ['PRO', 'MAX'] },
      'settings.farmerTipsEnabled': { $ne: false },
    }).lean();
    
    return farmers;
  }

  async sendTipsToFarmers(regionId, sendNotification) {
    const tips = await this.generateFarmerTips({ regionId });
    
    if (tips.length === 0) return { sent: 0 };
    
    const farmers = await this.getFarmersToNotify(regionId);
    let sent = 0;
    
    for (const farmer of farmers) {
      const topTip = tips[0];
      
      try {
        await sendNotification(farmer.telegramId, topTip.message);
        sent++;
      } catch (err) {
        console.error(`[FarmerTips] Failed to send to ${farmer.telegramId}:`, err.message);
      }
    }
    
    return { sent, tips };
  }
}

export default new FarmerTipsService();
