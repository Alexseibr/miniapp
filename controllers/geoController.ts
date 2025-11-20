import { Request, Response } from 'express';
import Ad from '../models/Ad';

export const getNearby = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm = 10, category, subcategory, seasonCode } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const distanceMeters = Number(radiusKm) * 1000;
    const query: Record<string, unknown> = {
      geo: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: distanceMeters,
        },
      },
    };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (seasonCode) query.seasonCode = seasonCode;

    const ads = await Ad.find(query).sort({ createdAt: -1 });
    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch nearby ads', error });
  }
};
