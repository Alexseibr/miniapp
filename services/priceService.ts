import Ad from '../models/Ad';
import PriceHistory from '../models/PriceHistory';
import notificationService from './notificationService';

const updatePrice = async (adId: string, newPrice: number) => {
  const ad = await Ad.findById(adId);
  if (!ad) {
    throw new Error('Ad not found');
  }

  const oldPrice = ad.price;
  ad.oldPrice = oldPrice;
  ad.price = newPrice;
  ad.priceChangedAt = new Date();
  await ad.save();

  const history = await PriceHistory.create({
    adId: ad._id,
    oldPrice,
    newPrice,
    changedAt: ad.priceChangedAt,
  });

  const priceChangeRecipients = await notificationService.notifyPriceChange(ad._id.toString());

  return { ad, history, recipients: priceChangeRecipients };
};

export default { updatePrice };
