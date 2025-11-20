const Ad = require('../../models/Ad');

async function getNearbyAds(req, res, next) {
  try {
    const { lat, lng, radiusKm = 5, categoryId, subcategoryId, season } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }

    const radiusNumber = Number(radiusKm);
    const finalRadiusKm = Number.isFinite(radiusNumber) && radiusNumber > 0 ? radiusNumber : 5;

    const baseQuery = { status: 'active', moderationStatus: 'approved' };
    if (categoryId) baseQuery.categoryId = categoryId;
    if (subcategoryId) baseQuery.subcategoryId = subcategoryId;
    if (season) baseQuery.seasonCode = season;

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNumber, latNumber] },
          distanceField: 'distanceMeters',
          maxDistance: finalRadiusKm * 1000,
          spherical: true,
          query: baseQuery,
          key: 'geo',
        },
      },
      {
        $addFields: {
          distanceMeters: { $round: ['$distanceMeters', 0] },
          distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 2] },
        },
      },
      { $sort: { distanceMeters: 1, createdAt: -1 } },
      { $limit: 100 },
    ];

    const items = await Ad.aggregate(pipeline);

    return res.json({ items });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNearbyAds,
};
