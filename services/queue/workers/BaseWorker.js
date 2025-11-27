/**
 * BaseWorker - Abstract base class for all queue workers
 * Provides common functionality: logging, error handling, metrics
 */

import { Worker } from 'bullmq';
import { getRedisConnection, WORKER_OPTIONS, isQueueEnabled } from '../config.js';

export class BaseWorker {
  constructor(queueName, processor) {
    this.queueName = queueName;
    this.processor = processor;
    this.worker = null;
    this.isRunning = false;
    this.processedCount = 0;
    this.failedCount = 0;
  }

  /**
   * Start the worker
   */
  async start() {
    if (!isQueueEnabled()) {
      console.log(`[${this.constructor.name}] Queue disabled - worker not started`);
      return false;
    }

    const connection = getRedisConnection();
    if (!connection) {
      console.warn(`[${this.constructor.name}] No Redis connection`);
      return false;
    }

    const workerOptions = WORKER_OPTIONS[this.queueName] || {};

    this.worker = new Worker(
      this.queueName,
      async (job) => {
        const startTime = Date.now();
        
        try {
          console.log(`[${this.constructor.name}] Processing job ${job.id}: ${job.name}`);
          
          const result = await this.processor(job);
          
          const duration = Date.now() - startTime;
          this.processedCount++;
          
          console.log(`[${this.constructor.name}] Job ${job.id} completed in ${duration}ms`);
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          this.failedCount++;
          
          console.error(`[${this.constructor.name}] Job ${job.id} failed after ${duration}ms:`, error.message);
          
          await this.onJobFailed(job, error);
          
          throw error;
        }
      },
      {
        connection,
        ...workerOptions,
      }
    );

    this._setupEventListeners();
    this.isRunning = true;

    console.log(`[${this.constructor.name}] Worker started for queue: ${this.queueName}`);
    return true;
  }

  /**
   * Setup worker event listeners
   */
  _setupEventListeners() {
    this.worker.on('completed', (job) => {
      this.onJobCompleted(job);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${this.constructor.name}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${this.constructor.name}] Worker error:`, err.message);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`[${this.constructor.name}] Job ${jobId} stalled`);
    });
  }

  /**
   * Hook: Called when job completes successfully
   * Override in subclass for custom behavior
   */
  async onJobCompleted(job) {
  }

  /**
   * Hook: Called when job fails
   * Override in subclass for custom behavior
   */
  async onJobFailed(job, error) {
  }

  /**
   * Get worker statistics
   */
  getStats() {
    return {
      queueName: this.queueName,
      isRunning: this.isRunning,
      processedCount: this.processedCount,
      failedCount: this.failedCount,
      successRate: this.processedCount > 0 
        ? ((this.processedCount - this.failedCount) / this.processedCount * 100).toFixed(2) + '%'
        : 'N/A',
    };
  }

  /**
   * Pause the worker
   */
  async pause() {
    if (this.worker) {
      await this.worker.pause();
      console.log(`[${this.constructor.name}] Worker paused`);
    }
  }

  /**
   * Resume the worker
   */
  async resume() {
    if (this.worker) {
      await this.worker.resume();
      console.log(`[${this.constructor.name}] Worker resumed`);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.worker) {
      console.log(`[${this.constructor.name}] Shutting down...`);
      await this.worker.close();
      this.isRunning = false;
      console.log(`[${this.constructor.name}] Shutdown complete`);
    }
  }
}

export default BaseWorker;
