import cron from 'node-cron';
import FarmerDemand from '../models/FarmerDemand.js';
import FarmerSuggestion from '../models/FarmerSuggestion.js';
import FarmerRegionService from '../services/FarmerRegionService.js';
import { sendFarmerSuggestion } from '../services/FarmerNotificationService.js';

const PRODUCT_MESSAGES = {
  картошка: 'картошку',
  картофель: 'картофель',
  морковь: 'морковь',
  свекла: 'свеклу',
  лук: 'лук',
  капуста: 'капусту',
  яблоки: 'яблоки',
  груши: 'груши',
  клубника: 'клубнику',
  малина: 'малину',
  черника: 'чернику',
  смородина: 'смородину',
  вишня: 'вишню',
  черешня: 'черешню',
  мёд: 'мёд',
  мед: 'мёд',
  яйца: 'яйца',
  молоко: 'молоко',
  творог: 'творог',
  сыр: 'сыр',
  сметана: 'сметану',
  зелень: 'зелень',
  огурцы: 'огурцы',
  помидоры: 'помидоры',
  грибы: 'грибы',
  мясо: 'мясо',
  курица: 'курицу',
  рыба: 'рыбу',
  выпечка: 'выпечку',
  хлеб: 'хлеб',
};

function generateMessage(productKey, demandInfo) {
  const productName = PRODUCT_MESSAGES[productKey] || productKey;
  const { searches24h, trend, trendPercent } = demandInfo;
  
  const templates = [
    `В вашем районе ищут ${productName}! За сутки ${searches24h} запросов. Разместите объявление и продайте быстрее.`,
    `Спрос на ${productName} растет! Пользователи рядом активно ищут этот товар. Самое время выставить объявление.`,
    `Люди в вашем районе ищут ${productName}. Если у вас есть — добавьте в раздел "Фермерский рынок".`,
  ];
  
  if (trend === 'up' && trendPercent > 50) {
    return `Спрос на ${productName} вырос на ${trendPercent}%! ${searches24h} запросов за сутки. Отличное время для продажи!`;
  }
  
  return templates[Math.floor(Math.random() * templates.length)];
}

class FarmerSuggestionWorker {
  constructor() {
    this.isRunning = false;
    this.minSearches = 5;
    this.suggestionCooldownDays = 3;
  }

  start() {
    console.log('[FarmerSuggestionWorker] Starting suggestion worker...');
    
    cron.schedule('30 * * * *', async () => {
      await this.generateSuggestions();
    });
    
    cron.schedule('*/5 * * * *', async () => {
      await this.sendPendingSuggestions();
    });
    
    console.log('[FarmerSuggestionWorker] Cron jobs scheduled - generate every hour, send every 5 min');
  }

  async generateSuggestions() {
    if (this.isRunning) {
      console.log('[FarmerSuggestionWorker] Already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      console.log('[FarmerSuggestionWorker] Generating suggestions...');
      
      const hotDemands = await FarmerDemand.find({
        searches24h: { $gte: this.minSearches },
        trend: 'up',
      })
        .sort({ searches24h: -1 })
        .limit(50)
        .lean();
      
      console.log(`[FarmerSuggestionWorker] Found ${hotDemands.length} hot demands`);
      
      let createdCount = 0;
      
      for (const demand of hotDemands) {
        const farmers = await FarmerRegionService.getFarmersInRegion(demand.regionId, {
          limit: 20,
        });
        
        for (const farmer of farmers) {
          const hasRecent = await FarmerSuggestion.hasRecentSuggestion(
            farmer.telegramId,
            demand.productKey,
            this.suggestionCooldownDays
          );
          
          if (hasRecent) continue;
          
          const message = generateMessage(demand.productKey, {
            searches24h: demand.searches24h,
            trend: demand.trend,
            trendPercent: demand.trendPercent,
          });
          
          await FarmerSuggestion.createSuggestion({
            farmerId: farmer.farmerId,
            farmerTelegramId: farmer.telegramId,
            regionId: demand.regionId,
            productKey: demand.productKey,
            message,
            demandInfo: {
              searches24h: demand.searches24h,
              trend: demand.trend,
              trendPercent: demand.trendPercent,
            },
            status: 'pending',
          });
          
          createdCount++;
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`[FarmerSuggestionWorker] Created ${createdCount} suggestions in ${duration}ms`);
      
    } catch (error) {
      console.error('[FarmerSuggestionWorker] Generation error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async sendPendingSuggestions() {
    try {
      const pending = await FarmerSuggestion.getPendingSuggestions(10);
      
      if (pending.length === 0) return;
      
      console.log(`[FarmerSuggestionWorker] Sending ${pending.length} pending suggestions...`);
      
      for (const suggestion of pending) {
        try {
          const result = await sendFarmerSuggestion(suggestion);
          
          if (result.success) {
            await FarmerSuggestion.markAsSent(suggestion._id, result.messageId);
          } else {
            await FarmerSuggestion.findByIdAndUpdate(suggestion._id, {
              $set: {
                status: 'expired',
                errorMessage: result.error,
              },
            });
          }
        } catch (error) {
          console.error(`[FarmerSuggestionWorker] Failed to send suggestion ${suggestion._id}:`, error);
          await FarmerSuggestion.findByIdAndUpdate(suggestion._id, {
            $set: {
              status: 'expired',
              errorMessage: error.message,
            },
          });
        }
      }
    } catch (error) {
      console.error('[FarmerSuggestionWorker] Send error:', error);
    }
  }
}

const farmerSuggestionWorker = new FarmerSuggestionWorker();
export default farmerSuggestionWorker;
