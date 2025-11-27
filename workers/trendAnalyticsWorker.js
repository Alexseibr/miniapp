import cron from 'node-cron';
import TrendAnalyticsService from '../services/TrendAnalyticsService.js';

export function startTrendAnalyticsWorker() {
  console.log('[TrendAnalyticsWorker] Starting trend analytics worker...');
  console.log('[TrendAnalyticsWorker] Will analyze trends daily at 6:00 AM and 18:00 PM');

  cron.schedule('0 6,18 * * *', async () => {
    console.log('[TrendAnalyticsWorker] Running scheduled trend analysis...');
    
    try {
      const trends = await TrendAnalyticsService.analyzeTrends();
      console.log(`[TrendAnalyticsWorker] Analysis complete. Found ${trends.length} new trends.`);
    } catch (error) {
      console.error('[TrendAnalyticsWorker] Error during trend analysis:', error);
    }
  }, {
    timezone: 'Europe/Minsk',
  });

  console.log('[TrendAnalyticsWorker] Cron job scheduled - runs at 6:00 AM and 6:00 PM (Europe/Minsk)');
}

export async function runTrendAnalysisNow() {
  console.log('[TrendAnalyticsWorker] Running immediate trend analysis...');
  
  try {
    const trends = await TrendAnalyticsService.analyzeTrends();
    console.log(`[TrendAnalyticsWorker] Analysis complete. Found ${trends.length} new trends.`);
    return trends;
  } catch (error) {
    console.error('[TrendAnalyticsWorker] Error during trend analysis:', error);
    throw error;
  }
}
