const User = require('../models/User');

function buildChangeSummary(adBefore = {}, adAfter = {}) {
  const priceChanged =
    typeof adBefore.price === 'number' &&
    typeof adAfter.price === 'number' &&
    adBefore.price !== adAfter.price;

  const statusChanged =
    typeof adBefore.status === 'string' &&
    typeof adAfter.status === 'string' &&
    adBefore.status !== adAfter.status;

  return {
    priceChanged,
    statusChanged,
    oldPrice: adBefore.price,
    newPrice: adAfter.price,
    oldStatus: adBefore.status,
    newStatus: adAfter.status,
  };
}

async function findUsersToNotifyOnAdChange(adBefore, adAfter) {
  if (!adAfter || !adAfter._id) {
    return [];
  }

  const changeSummary = buildChangeSummary(adBefore, adAfter);
  if (!changeSummary.priceChanged && !changeSummary.statusChanged) {
    return [];
  }

  const users = await User.find({ 'favorites.adId': adAfter._id });
  const notifications = [];

  for (const user of users) {
    let shouldNotify = false;
    let favoritesUpdated = false;

    for (const favorite of user.favorites || []) {
      if (!favorite.adId || favorite.adId.toString() !== adAfter._id.toString()) {
        continue;
      }

      if (changeSummary.priceChanged) {
        favorite.lastKnownPrice = adAfter.price;
        shouldNotify = true;
        favoritesUpdated = true;
      }

      if (changeSummary.statusChanged) {
        favorite.lastKnownStatus = adAfter.status;
        shouldNotify = true;
        favoritesUpdated = true;
      }
    }

    if (favoritesUpdated) {
      await user.save();
    }

    if (shouldNotify) {
      notifications.push({ user, changes: { ...changeSummary } });
    }
  }

  return notifications;
}

module.exports = {
  findUsersToNotifyOnAdChange,
};
