/**
 * AiTaskWorker - Processes AI-related background tasks
 * Low concurrency to avoid overloading AI services
 */

import { BaseWorker } from './BaseWorker.js';
import { QUEUES } from '../config.js';

class AiTaskWorker extends BaseWorker {
  constructor() {
    super(QUEUES.AI_TASKS, async (job) => this.processTask(job));
    this.services = {};
  }

  /**
   * Register AI services
   */
  registerServices(services) {
    this.services = { ...this.services, ...services };
  }

  /**
   * Process AI task
   */
  async processTask(job) {
    const { taskType, entityRef, context, options } = job.data;

    job.updateProgress(10);

    switch (taskType) {
      case 'generate-recommendations':
        return this._generateRecommendations(job, entityRef, context);
      
      case 'analyze-pricing':
        return this._analyzePricing(job, entityRef, context);
      
      case 'update-seller-twin':
        return this._updateSellerTwin(job, entityRef, context);
      
      case 'process-user-activity':
        return this._processUserActivity(job, entityRef, context);
      
      case 'generate-content':
        return this._generateContent(job, entityRef, context);
      
      case 'moderate-ad':
        return this._moderateAd(job, entityRef, context);
      
      default:
        throw new Error(`Unknown AI task type: ${taskType}`);
    }
  }

  /**
   * Generate recommendations for user
   */
  async _generateRecommendations(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.RecommendationEngine) {
      console.warn('[AiTaskWorker] RecommendationEngine not registered');
      return { skipped: true, reason: 'Service not available' };
    }

    const { userId, lat, lng, radiusKm } = context;
    
    const recommendations = await this.services.RecommendationEngine.getForYouFeed(
      userId,
      lat,
      lng,
      radiusKm,
      { limit: 20 }
    );

    job.updateProgress(100);

    return {
      userId: entityRef,
      recommendations: recommendations.items?.length || 0,
      cached: false,
    };
  }

  /**
   * Analyze pricing for ad
   */
  async _analyzePricing(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.DynamicPriceEngine) {
      return { skipped: true, reason: 'Service not available' };
    }

    const analysis = await this.services.DynamicPriceEngine.analyzePrice(entityRef);
    
    job.updateProgress(100);

    return {
      adId: entityRef,
      recommendation: analysis.recommendation,
      confidence: analysis.confidence,
    };
  }

  /**
   * Update seller's digital twin
   */
  async _updateSellerTwin(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.SellerTwinEngine) {
      return { skipped: true, reason: 'Service not available' };
    }

    const twin = await this.services.SellerTwinEngine.getFullOverview(entityRef);
    
    job.updateProgress(100);

    return {
      sellerId: entityRef,
      issuesCount: twin.issues?.length || 0,
      recommendationsCount: twin.recommendations?.length || 0,
    };
  }

  /**
   * Process user activity for learning
   */
  async _processUserActivity(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.DigitalTwinService) {
      return { skipped: true, reason: 'Service not available' };
    }

    const { activityType, data } = context;
    
    await this.services.DigitalTwinService.trackActivity(entityRef, activityType, data);
    
    job.updateProgress(100);

    return {
      userId: entityRef,
      activityType,
      processed: true,
    };
  }

  /**
   * Generate content (titles, descriptions)
   */
  async _generateContent(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.AiGateway) {
      return { skipped: true, reason: 'Service not available' };
    }

    const { contentType, input } = context;
    
    let result;
    switch (contentType) {
      case 'title':
        result = await this.services.AiGateway.generateTitle(input);
        break;
      case 'description':
        result = await this.services.AiGateway.generateDescription(input);
        break;
      case 'tags':
        result = await this.services.AiGateway.generateTags(input);
        break;
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }

    job.updateProgress(100);

    return { contentType, result };
  }

  /**
   * Moderate ad content
   */
  async _moderateAd(job, entityRef, context) {
    job.updateProgress(30);

    if (!this.services.ModerationService) {
      return { skipped: true, reason: 'Service not available' };
    }

    const result = await this.services.ModerationService.moderateAd(entityRef);
    
    job.updateProgress(100);

    return {
      adId: entityRef,
      riskScore: result.riskScore,
      flags: result.flags,
    };
  }
}

export const aiTaskWorker = new AiTaskWorker();
export default aiTaskWorker;
