/**
 * Queue Manager - Central hub for all BullMQ queues
 * Manages queue creation, job dispatching, and monitoring
 */

import { Queue, QueueEvents } from 'bullmq';
import {
  getRedisConnection,
  QUEUES,
  DEFAULT_QUEUE_OPTIONS,
  PRIORITY,
  isQueueEnabled,
} from './config.js';

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.queueEvents = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all queues
   */
  async initialize() {
    if (this.initialized || !isQueueEnabled()) {
      return false;
    }

    const connection = getRedisConnection();
    if (!connection) {
      console.warn('[QueueManager] Redis not available - using fallback mode');
      return false;
    }

    try {
      for (const [key, queueName] of Object.entries(QUEUES)) {
        const queue = new Queue(queueName, {
          connection,
          ...DEFAULT_QUEUE_OPTIONS,
        });

        const events = new QueueEvents(queueName, { connection });
        
        this.queues.set(queueName, queue);
        this.queueEvents.set(queueName, events);

        this._setupEventListeners(queueName, events);
      }

      this.initialized = true;
      console.log('[QueueManager] All queues initialized:', Object.keys(QUEUES).join(', '));
      return true;
    } catch (error) {
      console.error('[QueueManager] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for monitoring
   */
  _setupEventListeners(queueName, events) {
    events.on('completed', ({ jobId }) => {
      console.debug(`[Queue:${queueName}] Job ${jobId} completed`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
      console.error(`[Queue:${queueName}] Job ${jobId} failed:`, failedReason);
    });

    events.on('stalled', ({ jobId }) => {
      console.warn(`[Queue:${queueName}] Job ${jobId} stalled`);
    });
  }

  /**
   * Get a specific queue
   */
  getQueue(queueName) {
    return this.queues.get(queueName);
  }

  /**
   * Add job to notifications queue
   */
  async addNotification(data, options = {}) {
    return this._addJob(QUEUES.NOTIFICATIONS, 'send-notification', data, {
      priority: PRIORITY.HIGH,
      ...options,
    });
  }

  /**
   * Add job to analytics queue
   */
  async addAnalyticsEvent(data, options = {}) {
    return this._addJob(QUEUES.ANALYTICS, 'track-event', data, {
      priority: PRIORITY.LOW,
      ...options,
    });
  }

  /**
   * Add job to AI tasks queue
   */
  async addAiTask(taskType, data, options = {}) {
    return this._addJob(QUEUES.AI_TASKS, taskType, data, {
      priority: PRIORITY.NORMAL,
      ...options,
    });
  }

  /**
   * Add job to lifecycle queue
   */
  async addLifecycleTask(action, data, options = {}) {
    return this._addJob(QUEUES.LIFECYCLE, action, data, {
      priority: PRIORITY.NORMAL,
      ...options,
    });
  }

  /**
   * Add job to search alerts queue
   */
  async addSearchAlert(data, options = {}) {
    return this._addJob(QUEUES.SEARCH_ALERTS, 'process-alert', data, {
      priority: PRIORITY.HIGH,
      ...options,
    });
  }

  /**
   * Schedule a delayed job
   */
  async scheduleJob(queueName, jobName, data, delayMs, options = {}) {
    return this._addJob(queueName, jobName, data, {
      delay: delayMs,
      ...options,
    });
  }

  /**
   * Add a repeatable job (cron-like)
   */
  async addRepeatableJob(queueName, jobName, data, pattern, options = {}) {
    const queue = this.getQueue(queueName);
    if (!queue) {
      console.warn(`[QueueManager] Queue ${queueName} not found, using fallback`);
      return null;
    }

    return queue.add(jobName, data, {
      repeat: {
        pattern,
      },
      ...options,
    });
  }

  /**
   * Internal: Add job to queue
   */
  async _addJob(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName);
    
    if (!queue) {
      console.debug(`[QueueManager] Queue ${queueName} not available, executing synchronously`);
      return this._fallbackExecution(queueName, jobName, data);
    }

    try {
      const job = await queue.add(jobName, data, options);
      return { jobId: job.id, queued: true };
    } catch (error) {
      console.error(`[QueueManager] Failed to add job to ${queueName}:`, error);
      return this._fallbackExecution(queueName, jobName, data);
    }
  }

  /**
   * Fallback: Execute job synchronously when queue unavailable
   */
  async _fallbackExecution(queueName, jobName, data) {
    console.debug(`[QueueManager] Fallback execution for ${queueName}:${jobName}`);
    return { jobId: null, queued: false, fallback: true };
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        stats[name] = { waiting, active, completed, failed, delayed };
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Get failed jobs for a queue
   */
  async getFailedJobs(queueName, start = 0, end = 10) {
    const queue = this.getQueue(queueName);
    if (!queue) return [];

    return queue.getFailed(start, end);
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    if (!queue) return false;

    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
      return true;
    }
    return false;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.pause();
      return true;
    }
    return false;
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    if (queue) {
      await queue.resume();
      return true;
    }
    return false;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('[QueueManager] Shutting down...');
    
    for (const [name, events] of this.queueEvents) {
      await events.close();
    }

    for (const [name, queue] of this.queues) {
      await queue.close();
    }

    this.queues.clear();
    this.queueEvents.clear();
    this.initialized = false;

    console.log('[QueueManager] Shutdown complete');
  }
}

export const queueManager = new QueueManager();
export default queueManager;
