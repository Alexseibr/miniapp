import { Request, Response } from 'express';
import Ad from '../models/Ad';
import User from '../models/User';
import priceService from '../services/priceService';
import notificationService from '../services/notificationService';

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
      images = [],
      lat,
      lng,
      address,
    } = req.body;

    let location;
    if (lat != null && lng != null) {
      const latNumber = Number(lat);
      const lngNumber = Number(lng);

      if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
        return res.status(400).json({ message: 'lat and lng must be valid numbers' });
      }

      location = {
        type: 'Point' as const,
        coordinates: [lngNumber, latNumber] as [number, number],
        ...(address ? { address } : {}),
      };
    }

    const resolvedImages = Array.isArray(images) && images.length ? images : photos;

    const ad = await Ad.create({
      title,
      description,
      price,
      status: 'pending',
      category,
      subcategory,
      seasonCode,
      photos: resolvedImages,
      images: resolvedImages,
      userTelegramId: req.currentUser.telegramId,
      owner: req.currentUser._id,
      location,
      geo: location,
    });

    return res.status(201).json(ad);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create ad', error });
  }
};

export const getAds = async (req: Request, res: Response) => {
  try {
    const {
      category,
      subcategory,
      seasonCode,
      minPrice,
      maxPrice,
      priceFrom,
      priceTo,
      search,
      lat,
      lng,
      radiusKm,
    } = req.query;

    const query: Record<string, unknown> = { status: 'active' };

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (seasonCode) query.seasonCode = seasonCode;

    const minPriceValue = minPrice ?? priceFrom;
    const maxPriceValue = maxPrice ?? priceTo;

    if (minPriceValue || maxPriceValue) {
      query.price = {};
      if (minPriceValue) (query.price as Record<string, number>).$gte = Number(minPriceValue);
      if (maxPriceValue) (query.price as Record<string, number>).$lte = Number(maxPriceValue);
    }

    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    const radiusNumber = Number(radiusKm);

    if (Number.isFinite(latNumber) && Number.isFinite(lngNumber)) {
      const finalRadiusKm = Number.isFinite(radiusNumber) ? Math.min(Math.max(radiusNumber, 1), 100) : 10;
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [lngNumber, latNumber] },
          $maxDistance: finalRadiusKm * 1000,
        },
      };
    }

    const ads = await Ad.find(query).sort({ createdAt: -1 }).lean();
    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ads', error });
  }
};

export const getMyAds = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const ads = await Ad.find({
      $or: [
        { owner: req.currentUser._id },
        { userTelegramId: req.currentUser.telegramId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user ads', error });
  }
};

export const getAdById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findById(id)
      .populate({ path: 'owner', select: 'firstName lastName username phone telegramId' })
      .lean();
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.status !== 'active') {
      return res.status(404).json({ message: 'Ad not available' });
    }

    const owner = ad.owner || (await User.findOne({ telegramId: ad.userTelegramId }));
    return res.json({ ad, owner });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ad', error });
  }
};

export const updatePrice = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { price } = req.body;
    const ad = await Ad.findById(id);

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.userTelegramId !== req.currentUser.telegramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const result = await priceService.updatePrice(id, Number(price));

    return res.json({
      ad: result.ad,
      priceHistory: result.history,
      notifyRecipients: result.recipients,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update price', error });
  }
};

export const updateStatus = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    if (ad.userTelegramId !== req.currentUser.telegramId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    ad.status = status;
    await ad.save();

    const recipients = await notificationService.notifyStatusChange(ad._id.toString());

    return res.json({ ad, notifyRecipients: recipients });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status', error });
  }
};
