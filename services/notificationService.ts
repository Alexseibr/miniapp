import Favorite from '../models/Favorite';
import NotificationSubscription from '../models/NotificationSubscription';

const collectRecipients = async (
  adId: string,
  flags: { priceChange?: boolean; statusChange?: boolean }
): Promise<string[]> => {
  const subscriptions = await NotificationSubscription.find({ adId });
  const favorites = await Favorite.find({ $or: [{ ad: adId }, { adId }] });

  const recipients = new Set<string>();

  subscriptions.forEach((sub) => {
    if ((flags.priceChange && sub.notifyOnPriceChange) || (flags.statusChange && sub.notifyOnStatusChange)) {
      recipients.add(sub.userTelegramId);
    }
  });

  favorites.forEach((fav) => {
    if ((flags.priceChange && fav.notifyOnPriceChange) || (flags.statusChange && fav.notifyOnStatusChange)) {
      recipients.add(fav.userTelegramId);
    }
  });

  return Array.from(recipients);
};

const notifyPriceChange = async (adId: string): Promise<string[]> => collectRecipients(adId, { priceChange: true });

const notifyStatusChange = async (adId: string): Promise<string[]> => collectRecipients(adId, { statusChange: true });

export default { notifyPriceChange, notifyStatusChange };
