const User = require('../models/User');

async function notifyFavoritesOnAdChange(adBefore, adAfter) {
  try {
    if (!adBefore || !adAfter) {
      return;
    }

    const adId = adAfter._id || adBefore._id;
    if (!adId) {
      return;
    }

    const priceChanged =
      typeof adBefore.price === 'number' &&
      typeof adAfter.price === 'number' &&
      adBefore.price !== adAfter.price;

    const statusChanged =
      typeof adBefore.status === 'string' &&
      typeof adAfter.status === 'string' &&
      adBefore.status !== adAfter.status;

    if (!priceChanged && !statusChanged) {
      return;
    }

    const users = await User.find({ 'favorites.adId': adId });
    if (!users.length) {
      return;
    }

    console.log(
      `ℹ️ Ad ${adId} changed. Notifying ${users.length} users (пока только лог в консоль).`
    );
  } catch (error) {
    console.error('notifyFavoritesOnAdChange error:', error);
  }
}

module.exports = {
  notifyFavoritesOnAdChange,
};
