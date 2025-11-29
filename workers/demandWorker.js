import cron from 'node-cron';
import DemandNotificationService from '../services/DemandNotificationService.js';

let notificationCallback = null;

export function setDemandNotificationCallback(callback) {
  notificationCallback = callback;
}

async function runDemandAggregation() {
  console.log('[DemandWorker] Running demand aggregation...');
  
  try {
    await DemandNotificationService.aggregateDemandStats('day');
    console.log('[DemandWorker] Daily demand stats aggregated');
  } catch (error) {
    console.error('[DemandWorker] Error aggregating demand stats:', error);
  }
}

async function runSellerNotifications() {
  console.log('[DemandWorker] Running seller notifications...');
  
  try {
    const results = await DemandNotificationService.notifySellersAboutDemand(notificationCallback);
    console.log(`[DemandWorker] Notified ${results.length} sellers about demand`);
  } catch (error) {
    console.error('[DemandWorker] Error notifying sellers:', error);
  }
}

export function startDemandWorker() {
  console.log('[DemandWorker] Starting demand analytics worker...');
  
  cron.schedule('0 * * * *', runDemandAggregation, {
    timezone: 'Europe/Minsk',
  });
  console.log('[DemandWorker] Demand aggregation scheduled - runs every hour');
  
  cron.schedule('0 10,14,19 * * *', runSellerNotifications, {
    timezone: 'Europe/Minsk',
  });
  console.log('[DemandWorker] Seller notifications scheduled - runs at 10:00, 14:00, 19:00 (Europe/Minsk)');
  
  console.log('[DemandWorker] All cron jobs scheduled successfully');
}

export async function runDemandTasksNow() {
  console.log('[DemandWorker] Running all tasks manually...');
  await runDemandAggregation();
  await runSellerNotifications();
  console.log('[DemandWorker] All tasks completed');
}
