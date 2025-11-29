// services/adUpdateService.js
import Ad from '../models/Ad.js';
import * as notificationService from './notificationService.js';
import DigitalTwinNotificationService from './DigitalTwinNotificationService.js';

async function updateAdPrice(adId, newPrice) {
  const ad = await Ad.findById(adId);
  if (!ad) throw new Error('Ad not found');

  const oldPrice = ad.price;
  if (oldPrice === newPrice) return ad;

  ad.priceHistory.push({
    oldPrice,
    newPrice,
    changedAt: new Date(),
  });

  ad.price = newPrice;
  ad.lastPriceChangeAt = new Date();
  ad.hasPriceChangeForNotifications = true;

  await ad.save();

  await notificationService.handlePriceChange(ad, oldPrice, newPrice);

  if (oldPrice > newPrice) {
    setImmediate(async () => {
      try {
        await DigitalTwinNotificationService.processPriceDrop(ad, oldPrice, newPrice);
      } catch (error) {
        console.error('[DigitalTwin] Error processing price drop:', error);
      }
    });
  }

  return ad;
}

async function updateAdStatus(adId, newStatus) {
  const ad = await Ad.findById(adId);
  if (!ad) throw new Error('Ad not found');

  const oldStatus = ad.status;
  if (oldStatus === newStatus) return ad;

  ad.statusHistory.push({
    oldStatus,
    newStatus,
    changedAt: new Date(),
  });

  ad.status = newStatus;
  ad.hasStatusChangeForNotifications = true;

  await ad.save();

  await notificationService.handleStatusChange(ad, oldStatus, newStatus);

  return ad;
}

export { updateAdPrice,updateAdStatus };
