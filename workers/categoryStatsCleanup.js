import cron from 'node-cron';
import CategoryWordStatsService from '../services/CategoryWordStatsService.js';

const MIN_COUNT = parseInt(process.env.CATEGORY_STATS_MIN_COUNT, 10) || 2;
const MAX_AGE_DAYS = parseInt(process.env.CATEGORY_STATS_MAX_AGE_DAYS, 10) || 90;

export function startCategoryStatsCleanupWorker() {
  console.log('[CategoryStatsCleanup] Starting category word stats cleanup worker...');
  console.log(`[CategoryStatsCleanup] Will clean entries with count <= ${MIN_COUNT} older than ${MAX_AGE_DAYS} days`);

  cron.schedule('0 3 * * 0', async () => {
    console.log('[CategoryStatsCleanup] Running weekly cleanup...');
    
    try {
      const result = await CategoryWordStatsService.cleanupOldStats(MIN_COUNT, MAX_AGE_DAYS);
      console.log(`[CategoryStatsCleanup] Cleanup complete: ${result.deleted} entries removed`);
    } catch (error) {
      console.error('[CategoryStatsCleanup] Error during cleanup:', error.message);
    }
  });

  console.log('[CategoryStatsCleanup] Cron job scheduled - runs every Sunday at 3:00 AM');
}

export default { startCategoryStatsCleanupWorker };
