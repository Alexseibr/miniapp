import AiTextService from './AiTextService.js';
import RecommendationService from './RecommendationService.js';
import ModerationService from './ModerationService.js';

class AiGateway {
  constructor() {
    this.text = AiTextService;
    this.recommend = RecommendationService;
    this.moderation = ModerationService;
    
    this.requestLog = [];
    this.maxLogSize = 1000;
  }

  logRequest(service, method, input, result) {
    const logEntry = {
      timestamp: new Date(),
      service,
      method,
      inputPreview: JSON.stringify(input).slice(0, 200),
      success: result?.success ?? true,
      duration: result?.duration
    };
    
    this.requestLog.unshift(logEntry);
    
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog = this.requestLog.slice(0, this.maxLogSize);
    }
  }

  async suggestTitle(input) {
    const start = Date.now();
    const result = await this.text.suggestTitle(input);
    result.duration = Date.now() - start;
    this.logRequest('text', 'suggestTitle', input, result);
    return result;
  }

  async suggestDescription(input) {
    const start = Date.now();
    const result = await this.text.suggestDescription(input);
    result.duration = Date.now() - start;
    this.logRequest('text', 'suggestDescription', input, result);
    return result;
  }

  async suggestTags(input) {
    const start = Date.now();
    const result = await this.text.suggestTags(input);
    result.duration = Date.now() - start;
    this.logRequest('text', 'suggestTags', input, result);
    return result;
  }

  async getSimilarAds(input) {
    const start = Date.now();
    const result = await this.recommend.getSimilarAds(input);
    result.duration = Date.now() - start;
    this.logRequest('recommend', 'getSimilarAds', input, result);
    return result;
  }

  async getPersonalFeed(input) {
    const start = Date.now();
    const result = await this.recommend.getPersonalFeed(input);
    result.duration = Date.now() - start;
    this.logRequest('recommend', 'getPersonalFeed', input, result);
    return result;
  }

  async getTrendingNearby(input) {
    const start = Date.now();
    const result = await this.recommend.getTrendingNearby(input);
    result.duration = Date.now() - start;
    this.logRequest('recommend', 'getTrendingNearby', input, result);
    return result;
  }

  async trackUserActivity(input) {
    return this.recommend.trackUserActivity(input);
  }

  async checkAdModeration(input) {
    const start = Date.now();
    const result = await this.moderation.checkAd(input);
    result.duration = Date.now() - start;
    this.logRequest('moderation', 'checkAd', input, result);
    return result;
  }

  async getModerationQueue(options) {
    return this.moderation.getModerationQueue(options);
  }

  getStats() {
    const now = Date.now();
    const lastHour = this.requestLog.filter(r => now - r.timestamp.getTime() < 3600000);
    const lastDay = this.requestLog.filter(r => now - r.timestamp.getTime() < 86400000);
    
    const byService = {};
    for (const entry of lastDay) {
      if (!byService[entry.service]) {
        byService[entry.service] = { count: 0, errors: 0, totalDuration: 0 };
      }
      byService[entry.service].count++;
      if (!entry.success) byService[entry.service].errors++;
      byService[entry.service].totalDuration += entry.duration || 0;
    }
    
    for (const service of Object.keys(byService)) {
      byService[service].avgDuration = Math.round(
        byService[service].totalDuration / byService[service].count
      );
    }
    
    return {
      totalRequests: this.requestLog.length,
      lastHourRequests: lastHour.length,
      lastDayRequests: lastDay.length,
      byService,
      lastRequests: this.requestLog.slice(0, 10)
    };
  }
}

const aiGateway = new AiGateway();

export default aiGateway;
export { AiGateway };
