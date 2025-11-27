import cron from 'node-cron';
import { mediaService } from '../services/MediaService.js';

const CLEANUP_HOURS_OLD = parseInt(process.env.MEDIA_CLEANUP_HOURS_OLD || '24', 10);

export function startMediaCleanupWorker() {
  console.log('[MediaCleanup] Starting media cleanup worker...');
  console.log(`[MediaCleanup] Will clean temporary files older than ${CLEANUP_HOURS_OLD} hours`);

  cron.schedule('0 * * * *', async () => {
    console.log('[MediaCleanup] Running scheduled cleanup...');
    
    try {
      const result = await mediaService.cleanupTemporaryFiles(CLEANUP_HOURS_OLD);
      
      console.log(`[MediaCleanup] Cleanup complete: ${result.deletedCount}/${result.totalFound} files removed`);
    } catch (error) {
      console.error('[MediaCleanup] Cleanup failed:', error.message);
    }
  });

  console.log('[MediaCleanup] Cron job scheduled - runs every hour');
}

export async function runMediaCleanupManually(hoursOld) {
  console.log(`[MediaCleanup] Manual cleanup starting (${hoursOld || CLEANUP_HOURS_OLD}h old files)...`);
  
  try {
    const result = await mediaService.cleanupTemporaryFiles(hoursOld || CLEANUP_HOURS_OLD);
    
    console.log(`[MediaCleanup] Manual cleanup complete: ${result.deletedCount}/${result.totalFound} files removed`);
    return result;
  } catch (error) {
    console.error('[MediaCleanup] Manual cleanup failed:', error.message);
    throw error;
  }
}
