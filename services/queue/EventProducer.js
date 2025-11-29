/**
 * EventProducer - Unified API for sending events to queues
 * Services use this to emit events without knowing queue details
 */

import { queueManager } from './QueueManager.js';
import { QUEUES, PRIORITY, isQueueEnabled } from './config.js';

class EventProducerClass {
  /**
   * Send Telegram notification
   */
  async sendNotification(targetTelegramId, text, options = {}) {
    return queueManager.addNotification({
      type: 'message',
      targetTelegramId,
      payload: { text },
      ...options,
    }, {
      priority: options.urgent ? PRIORITY.URGENT : PRIORITY.HIGH,
    });
  }

  /**
   * Send notification with photo
   */
  async sendPhotoNotification(targetTelegramId, photo, caption, options = {}) {
    return queueManager.addNotification({
      type: 'photo',
      targetTelegramId,
      payload: { photo, caption },
    }, options);
  }

  /**
   * Send notification with inline keyboard
   */
  async sendInteractiveNotification(targetTelegramId, text, keyboard, options = {}) {
    return queueManager.addNotification({
      type: 'callback',
      targetTelegramId,
      payload: { text, keyboard },
    }, options);
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotifications(messages, options = {}) {
    return queueManager.addNotification({
      type: 'batch',
      payload: { messages },
      options,
    }, {
      priority: PRIORITY.NORMAL,
    });
  }

  /**
   * Track analytics event
   */
  async trackEvent(action, actorId, metadata = {}) {
    return queueManager.addAnalyticsEvent({
      action,
      actorId,
      metadata,
      occurredAt: new Date().toISOString(),
    });
  }

  /**
   * Track analytics event immediately (bypass buffer)
   */
  async trackEventImmediate(action, actorId, metadata = {}) {
    return queueManager.addAnalyticsEvent({
      action,
      actorId,
      metadata,
      occurredAt: new Date().toISOString(),
      immediate: true,
    });
  }

  /**
   * Request AI recommendations generation
   */
  async requestRecommendations(userId, lat, lng, radiusKm) {
    return queueManager.addAiTask('generate-recommendations', {
      taskType: 'generate-recommendations',
      entityRef: userId,
      context: { userId, lat, lng, radiusKm },
    });
  }

  /**
   * Request price analysis
   */
  async requestPriceAnalysis(adId) {
    return queueManager.addAiTask('analyze-pricing', {
      taskType: 'analyze-pricing',
      entityRef: adId,
      context: {},
    });
  }

  /**
   * Request seller twin update
   */
  async requestSellerTwinUpdate(sellerId) {
    return queueManager.addAiTask('update-seller-twin', {
      taskType: 'update-seller-twin',
      entityRef: sellerId,
      context: {},
    });
  }

  /**
   * Request content generation
   */
  async requestContentGeneration(contentType, input) {
    return queueManager.addAiTask('generate-content', {
      taskType: 'generate-content',
      entityRef: null,
      context: { contentType, input },
    });
  }

  /**
   * Request ad moderation
   */
  async requestAdModeration(adId) {
    return queueManager.addAiTask('moderate-ad', {
      taskType: 'moderate-ad',
      entityRef: adId,
      context: {},
    });
  }

  /**
   * Track user activity for AI learning
   */
  async trackUserActivity(userId, activityType, data) {
    return queueManager.addAiTask('process-user-activity', {
      taskType: 'process-user-activity',
      entityRef: userId,
      context: { activityType, data },
    }, {
      priority: PRIORITY.LOW,
    });
  }

  /**
   * Schedule ad expiration check
   */
  async scheduleExpirationCheck(adId, checkAt) {
    const delay = new Date(checkAt).getTime() - Date.now();
    
    return queueManager.scheduleJob(
      QUEUES.LIFECYCLE,
      'check-expiration',
      { action: 'check-expiration', adId, data: {} },
      Math.max(delay, 0)
    );
  }

  /**
   * Trigger ad expiration
   */
  async expireAd(adId) {
    return queueManager.addLifecycleTask('expire-ad', {
      action: 'expire-ad',
      adId,
      data: {},
    });
  }

  /**
   * Request ad republish
   */
  async republishAd(adId, ttlDays = 30) {
    return queueManager.addLifecycleTask('republish-ad', {
      action: 'republish-ad',
      adId,
      data: { ttlDays },
    });
  }

  /**
   * Send reminder to seller
   */
  async sendSellerReminder(adId, type, message) {
    return queueManager.addLifecycleTask('send-reminder', {
      action: 'send-reminder',
      adId,
      data: { type, message },
    });
  }

  /**
   * Schedule expired ads cleanup
   */
  async scheduleCleanup(olderThanDays = 90) {
    return queueManager.addLifecycleTask('cleanup-expired', {
      action: 'cleanup-expired',
      adId: null,
      data: { olderThanDays },
    }, {
      priority: PRIORITY.LOW,
    });
  }

  /**
   * Check new ad against search alerts
   */
  async checkNewAdForAlerts(adId) {
    return queueManager.addSearchAlert({
      type: 'new-ad-check',
      data: { adId },
    });
  }

  /**
   * Notify user of alert match
   */
  async notifyAlertMatch(alertId, adId) {
    return queueManager.addSearchAlert({
      type: 'user-alert-match',
      data: { alertId, adId },
    });
  }

  /**
   * Run bulk alert scan
   */
  async scanAllAlerts(limit = 1000) {
    return queueManager.addSearchAlert({
      type: 'bulk-scan',
      data: { limit },
    }, {
      priority: PRIORITY.LOW,
    });
  }

  /**
   * Cleanup old alerts
   */
  async cleanupOldAlerts(olderThanDays = 30) {
    return queueManager.addSearchAlert({
      type: 'cleanup',
      data: { olderThanDays },
    }, {
      priority: PRIORITY.LOW,
    });
  }

  /**
   * Check if queues are available
   */
  isAvailable() {
    return isQueueEnabled();
  }
}

export const EventProducer = new EventProducerClass();
export default EventProducer;
