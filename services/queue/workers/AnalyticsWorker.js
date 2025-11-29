/**
 * AnalyticsWorker - Batch processes analytics events
 * High concurrency, low priority for background tracking
 */

import { BaseWorker } from './BaseWorker.js';
import { QUEUES } from '../config.js';
import AnalyticsEvent from '../../../models/AnalyticsEvent.js';

class AnalyticsWorker extends BaseWorker {
  constructor() {
    super(QUEUES.ANALYTICS, async (job) => this.processEvent(job));
    this.batchBuffer = [];
    this.batchSize = 50;
    this.flushInterval = null;
  }

  /**
   * Start worker with batch flushing
   */
  async start() {
    const started = await super.start();
    
    if (started) {
      this.flushInterval = setInterval(() => this._flushBatch(), 30000);
    }
    
    return started;
  }

  /**
   * Process analytics event
   */
  async processEvent(job) {
    const { action, actorId, metadata, occurredAt, immediate } = job.data;

    const event = {
      action,
      actorId,
      metadata: metadata || {},
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      processedAt: new Date(),
    };

    if (immediate) {
      return this._saveEvent(event);
    }

    this.batchBuffer.push(event);

    if (this.batchBuffer.length >= this.batchSize) {
      await this._flushBatch();
    }

    return { buffered: true, bufferSize: this.batchBuffer.length };
  }

  /**
   * Save single event
   */
  async _saveEvent(event) {
    try {
      const saved = await AnalyticsEvent.create(event);
      return { saved: true, eventId: saved._id };
    } catch (error) {
      console.error('[AnalyticsWorker] Failed to save event:', error.message);
      throw error;
    }
  }

  /**
   * Flush batch buffer to database
   */
  async _flushBatch() {
    if (this.batchBuffer.length === 0) return;

    const batch = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      const result = await AnalyticsEvent.insertMany(batch, { ordered: false });
      console.log(`[AnalyticsWorker] Flushed ${result.length} events to database`);
      return { flushed: result.length };
    } catch (error) {
      console.error('[AnalyticsWorker] Batch flush failed:', error.message);
      this.batchBuffer.push(...batch);
      throw error;
    }
  }

  /**
   * Shutdown with final flush
   */
  async shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this._flushBatch();
    await super.shutdown();
  }

  /**
   * Get analytics worker stats
   */
  getAnalyticsStats() {
    return {
      ...this.getStats(),
      bufferSize: this.batchBuffer.length,
      batchSize: this.batchSize,
    };
  }
}

export const analyticsWorker = new AnalyticsWorker();
export default analyticsWorker;
