function isAdVisibleForPublic(ad) {
  if (!ad) {
    return false;
  }

  return ad.status === 'active' && ad.moderationStatus === 'approved';
}

module.exports = {
  isAdVisibleForPublic,
};
