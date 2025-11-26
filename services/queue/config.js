/**
 * BullMQ Queue Configuration
 * Distributed message queue system for KETMAR Market
 * 
 * Supports: Upstash Redis, Redis Cloud, self-hosted Redis
 */

import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

let redisConnection = null;

/**
 * Create Redis connection for BullMQ
 * Optimized for Upstash with TLS support
 */
export function getRedisConnection() {
  if (redisConnection) {
    return redisConnection;
  }

  if (!REDIS_URL) {
    console.warn('[Queue] REDIS_URL not configured - queues disabled');
    return null;
  }

  try {
    const isUpstash = REDIS_URL.includes('upstash.io');
    
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...(isUpstash ? { tls: {} } : {}),
      retryStrategy: (times) => {
        if (times > 3) {
          console.error('[Queue] Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisConnection.on('connect', () => {
      console.log('[Queue] Redis connected');
    });

    redisConnection.on('error', (err) => {
      console.error('[Queue] Redis error:', err.message);
    });

    return redisConnection;
  } catch (error) {
    console.error('[Queue] Failed to create Redis connection:', error);
    return null;
  }
}

/**
 * Queue Names (no colons - BullMQ restriction)
 */
export const QUEUES = {
  NOTIFICATIONS: 'ketmar-notifications',
  ANALYTICS: 'ketmar-analytics',
  AI_TASKS: 'ketmar-ai-tasks',
  LIFECYCLE: 'ketmar-lifecycle',
  SEARCH_ALERTS: 'ketmar-search-alerts',
};

/**
 * Default Queue Options
 * Optimized for Upstash (reduced polling)
 */
export const DEFAULT_QUEUE_OPTIONS = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 86400,
    },
  },
};

/**
 * Worker Options per Queue
 */
export const WORKER_OPTIONS = {
  [QUEUES.NOTIFICATIONS]: {
    concurrency: 5,
    limiter: {
      max: 25,
      duration: 1000,
    },
    drainDelay: 5000,
  },
  [QUEUES.ANALYTICS]: {
    concurrency: 20,
    drainDelay: 10000,
  },
  [QUEUES.AI_TASKS]: {
    concurrency: 3,
    drainDelay: 15000,
  },
  [QUEUES.LIFECYCLE]: {
    concurrency: 10,
    drainDelay: 30000,
  },
  [QUEUES.SEARCH_ALERTS]: {
    concurrency: 10,
    drainDelay: 10000,
  },
};

/**
 * Job Priority Levels
 */
export const PRIORITY = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

/**
 * Check if queues are available
 */
export function isQueueEnabled() {
  return !!REDIS_URL;
}

/**
 * Close Redis connection gracefully
 */
export async function closeConnection() {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('[Queue] Redis connection closed');
  }
}

export default {
  getRedisConnection,
  QUEUES,
  DEFAULT_QUEUE_OPTIONS,
  WORKER_OPTIONS,
  PRIORITY,
  isQueueEnabled,
  closeConnection,
};
