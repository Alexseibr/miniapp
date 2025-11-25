const cron = require('node-cron');
const AnalyticsService = require('../services/AnalyticsService');

/**
 * Analytics Worker
 * Runs daily at 02:00 to update price stats for all farmer/seasonal categories
 */
function startAnalyticsWorker() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[AnalyticsWorker] Starting daily price stats update...');
    
    try {
      const results = await AnalyticsService.updateAllFarmerStats();
      
      const successful = results.filter(r => r.status === 'ok').length;
      const failed = results.filter(r => r.status === 'error').length;
      
      console.log(`[AnalyticsWorker] Completed: ${successful} categories updated, ${failed} failed`);
      
      if (failed > 0) {
        const errors = results.filter(r => r.status === 'error');
        console.error('[AnalyticsWorker] Failed categories:', errors);
      }
    } catch (error) {
      console.error('[AnalyticsWorker] Fatal error:', error);
    }
  }, {
    timezone: 'Europe/Minsk'
  });

  console.log('[AnalyticsWorker] Scheduled for daily 02:00 (Europe/Minsk)');
}

module.exports = { startAnalyticsWorker };
