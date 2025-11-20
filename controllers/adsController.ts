import { Request, Response } from 'express';
import Ad from '../models/Ad';
import User from '../models/User';

export const createAd = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      title,
      description,
      price,
      category,
      subcategory,
      seasonCode,
      photos = [],
      lat,
      lng,
    } = req.body;

    const ad = await Ad.create({
      title,
      description,
      price,
      category,
      subcategory,
      seasonCode,
      photos,
      userTelegramId: req.currentUser.telegramId,
      geo: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
    });

    return res.status(201).json(ad);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create ad', error });
  }
};

export const getAds = async (req: Request, res: Response) => {
  try {
    const { category, subcategory, seasonCode, minPrice, maxPrice, search } = req.query;

    const query: Record<string, unknown> = {};

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (seasonCode) query.seasonCode = seasonCode;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) (query.price as Record<string, number>).$gte = Number(minPrice);
      if (maxPrice) (query.price as Record<string, number>).$lte = Number(maxPrice);
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const ads = await Ad.find(query).sort({ createdAt: -1 });
    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ads', error });
  }
};

export const getNearbyAds = async (req: Request, res: Response) => {
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

export const getAdById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    const owner = await User.findOne({ telegramId: ad.userTelegramId });
    return res.json({ ad, owner });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ad', error });
  }
};
