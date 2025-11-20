import { Request, Response } from 'express';
import Ad from '../models/Ad';

export const getNearby = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm = 10, category, subcategory, seasonCode, priceFrom, priceTo } = req.query;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);

    if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }

    const radiusNumber = Number(radiusKm);
    const normalizedRadiusKm = Number.isFinite(radiusNumber) ? radiusNumber : 10;
    const finalRadiusKm = Math.min(Math.max(normalizedRadiusKm, 1), 100);
    const distanceMeters = finalRadiusKm * 1000;

    const query: Record<string, unknown> = {
      status: 'active',
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lngNumber, latNumber],
          },
          $maxDistance: distanceMeters,
        },
      },
    };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (seasonCode) query.seasonCode = seasonCode;

    if (priceFrom || priceTo) {
      query.price = {};
      if (priceFrom) (query.price as Record<string, number>).$gte = Number(priceFrom);
      if (priceTo) (query.price as Record<string, number>).$lte = Number(priceTo);
    }

    const ads = await Ad.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch nearby ads', error });
  }
};
