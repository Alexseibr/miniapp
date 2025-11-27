/**
 * Queue Management API Routes
 * Monitoring, health checks, and admin operations
 */

import { Router } from 'express';
import { 
  queueManager, 
  getQueueHealth, 
  isQueueEnabled,
  QUEUES,
} from '../../services/queue/index.js';

const router = Router();

/**
 * GET /api/queues/health
 * Get health status of all queues
 */
router.get('/health', async (req, res) => {
  try {
    const health = await getQueueHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'disabled' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/queues/stats
 * Get detailed queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    if (!isQueueEnabled()) {
      return res.json({
        success: true,
        data: { mode: 'fallback', message: 'Queues disabled' },
      });
    }

    const stats = await queueManager.getStats();
    
    res.json({
      success: true,
      data: {
        queues: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/queues/:queueName/failed
 * Get failed jobs for a specific queue
 */
router.get('/:queueName/failed', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { start = 0, end = 20 } = req.query;
    
    const fullQueueName = QUEUES[queueName.toUpperCase()];
    if (!fullQueueName) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const failedJobs = await queueManager.getFailedJobs(
      fullQueueName,
      parseInt(start),
      parseInt(end)
    );

    const jobs = failedJobs.map(job => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    }));

    res.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/queues/:queueName/retry/:jobId
 * Retry a failed job
 */
router.post('/:queueName/retry/:jobId', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;
    
    const fullQueueName = QUEUES[queueName.toUpperCase()];
    if (!fullQueueName) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const success = await queueManager.retryJob(fullQueueName, jobId);

    res.json({
      success,
      message: success ? 'Job queued for retry' : 'Job not found',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/queues/:queueName/pause
 * Pause a queue
 */
router.post('/:queueName/pause', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    const fullQueueName = QUEUES[queueName.toUpperCase()];
    if (!fullQueueName) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const success = await queueManager.pauseQueue(fullQueueName);

    res.json({
      success,
      message: success ? 'Queue paused' : 'Failed to pause queue',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/queues/:queueName/resume
 * Resume a paused queue
 */
router.post('/:queueName/resume', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    const fullQueueName = QUEUES[queueName.toUpperCase()];
    if (!fullQueueName) {
      return res.status(404).json({
        success: false,
        error: 'Queue not found',
      });
    }

    const success = await queueManager.resumeQueue(fullQueueName);

    res.json({
      success,
      message: success ? 'Queue resumed' : 'Failed to resume queue',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/queues/config
 * Get queue configuration (for debugging)
 */
router.get('/config', async (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: isQueueEnabled(),
      queues: Object.keys(QUEUES),
      queueNames: QUEUES,
    },
  });
});

export default router;
