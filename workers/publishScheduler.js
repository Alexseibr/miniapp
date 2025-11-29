import cron from 'node-cron';
import Ad from '../models/Ad.js';

let isRunning = false;

async function activateScheduledAds() {
  if (isRunning) {
    console.log('[PublishScheduler] Previous job still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    const now = new Date();

    const adsToActivate = await Ad.find({
      status: 'scheduled',
      publishAt: { $lte: now },
    }).limit(100);

    if (!adsToActivate.length) {
      isRunning = false;
      return;
    }

    console.log(`[PublishScheduler] Found ${adsToActivate.length} ads to activate`);

    let activatedCount = 0;
    let errorCount = 0;

    for (const ad of adsToActivate) {
      try {
        if (ad.status === 'archived' || ad.status === 'hidden') {
          console.log(`[PublishScheduler] Skipping ad ${ad._id} - status is ${ad.status}`);
          continue;
        }

        ad.status = 'active';
        if (ad.moderationStatus === 'scheduled') {
          ad.moderationStatus = 'pending';
        }
        ad.publishAt = null;
        await ad.save();

        activatedCount++;
        console.log(`[PublishScheduler] Activated ad: ${ad._id} - "${ad.title}"`);
      } catch (adError) {
        errorCount++;
        console.error(`[PublishScheduler] Error activating ad ${ad._id}:`, adError.message);
      }
    }

    console.log(`[PublishScheduler] Completed: ${activatedCount} activated, ${errorCount} errors`);
  } catch (error) {
    console.error('[PublishScheduler] Job error:', error.message);
  } finally {
    isRunning = false;
  }
}

function startPublishScheduler() {
  console.log('[PublishScheduler] Starting scheduled ads publisher...');

  cron.schedule('* * * * *', activateScheduledAds, {
    scheduled: true,
    timezone: 'Europe/Minsk',
  });

  console.log('[PublishScheduler] Cron job scheduled - runs every minute');

  setTimeout(activateScheduledAds, 5000);
}

export { startPublishScheduler, activateScheduledAds };
export default startPublishScheduler;
