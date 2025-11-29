import cron from 'node-cron';
import HotSearchService from '../services/HotSearchService.js';

let isRunning = false;

async function runHotSearchAggregation() {
  if (isRunning) {
    console.log('[HotSearchWorker] Already running, skipping...');
    return;
  }

  isRunning = true;
  console.log('[HotSearchWorker] Starting hot search aggregation...');

  try {
    const result = await HotSearchService.aggregateHotSearches(6, 5);
    console.log(`[HotSearchWorker] Aggregation complete: ${result.total} hot searches processed`);

    await HotSearchService.cleanupOldLogs(7);
    
    console.log('[HotSearchWorker] Hot search aggregation finished successfully');
  } catch (error) {
    console.error('[HotSearchWorker] Error during aggregation:', error);
  } finally {
    isRunning = false;
  }
}

export function startHotSearchWorker() {
  console.log('[HotSearchWorker] Starting hot search worker...');
  console.log('[HotSearchWorker] Will aggregate hot searches every hour');

  cron.schedule('0 * * * *', () => {
    console.log('[HotSearchWorker] Hourly aggregation triggered');
    runHotSearchAggregation();
  }, {
    timezone: 'Europe/Minsk',
  });

  console.log('[HotSearchWorker] Cron job scheduled - runs every hour');

  setTimeout(() => {
    console.log('[HotSearchWorker] Running initial aggregation...');
    runHotSearchAggregation();
  }, 30000);
}

export { runHotSearchAggregation };
