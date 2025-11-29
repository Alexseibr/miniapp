/**
 * Queue System - Main Entry Point
 * Distributed message queue for KETMAR Market
 * 
 * Usage:
 *   import { queueManager, EventProducer } from './services/queue';
 *   
 *   // Initialize queues
 *   await queueManager.initialize();
 *   
 *   // Send notification
 *   await EventProducer.sendNotification(telegramId, 'Hello!');
 */

export { queueManager } from './QueueManager.js';
export { EventProducer } from './EventProducer.js';
export { 
  QUEUES, 
  PRIORITY, 
  isQueueEnabled, 
  closeConnection,
  getRedisConnection,
} from './config.js';

export { notificationWorker } from './workers/NotificationWorker.js';
export { analyticsWorker } from './workers/AnalyticsWorker.js';
export { aiTaskWorker } from './workers/AiTaskWorker.js';
export { lifecycleWorker } from './workers/LifecycleWorker.js';
export { searchAlertWorker } from './workers/SearchAlertWorker.js';

import { queueManager } from './QueueManager.js';
import { notificationWorker } from './workers/NotificationWorker.js';
import { analyticsWorker } from './workers/AnalyticsWorker.js';
import { aiTaskWorker } from './workers/AiTaskWorker.js';
import { lifecycleWorker } from './workers/LifecycleWorker.js';
import { searchAlertWorker } from './workers/SearchAlertWorker.js';
import { isQueueEnabled, closeConnection } from './config.js';

/**
 * Initialize all queue infrastructure
 */
export async function initializeQueues(options = {}) {
  if (!isQueueEnabled()) {
    console.log('[Queues] Redis not configured - running in fallback mode');
    return { initialized: false, fallback: true };
  }

  try {
    const queueInitialized = await queueManager.initialize();
    
    if (!queueInitialized) {
      return { initialized: false, fallback: true };
    }

    const workers = [];

    if (options.telegramBot) {
      notificationWorker.setBot(options.telegramBot);
    }

    if (options.notificationCallback) {
      lifecycleWorker.setNotificationCallback(options.notificationCallback);
      searchAlertWorker.setNotificationCallback(options.notificationCallback);
    }

    if (options.aiServices) {
      aiTaskWorker.registerServices(options.aiServices);
    }

    if (options.enableWorkers !== false) {
      workers.push(await notificationWorker.start());
      workers.push(await analyticsWorker.start());
      workers.push(await aiTaskWorker.start());
      workers.push(await lifecycleWorker.start());
      workers.push(await searchAlertWorker.start());
    }

    console.log('[Queues] All workers started:', workers.filter(Boolean).length);

    return { 
      initialized: true, 
      workersStarted: workers.filter(Boolean).length,
    };
  } catch (error) {
    console.error('[Queues] Initialization failed:', error);
    return { initialized: false, error: error.message };
  }
}

/**
 * Graceful shutdown of all queues
 */
export async function shutdownQueues() {
  console.log('[Queues] Shutting down...');

  await Promise.all([
    notificationWorker.shutdown(),
    analyticsWorker.shutdown(),
    aiTaskWorker.shutdown(),
    lifecycleWorker.shutdown(),
    searchAlertWorker.shutdown(),
  ]);

  await queueManager.shutdown();
  await closeConnection();

  console.log('[Queues] Shutdown complete');
}

/**
 * Get health status of all queues
 */
export async function getQueueHealth() {
  if (!isQueueEnabled()) {
    return { status: 'disabled', mode: 'fallback' };
  }

  try {
    const stats = await queueManager.getStats();
    
    return {
      status: 'healthy',
      queues: stats,
      workers: {
        notifications: notificationWorker.getStats(),
        analytics: analyticsWorker.getAnalyticsStats(),
        aiTasks: aiTaskWorker.getStats(),
        lifecycle: lifecycleWorker.getStats(),
        searchAlerts: searchAlertWorker.getStats(),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
    };
  }
}

export default {
  queueManager,
  initializeQueues,
  shutdownQueues,
  getQueueHealth,
};
