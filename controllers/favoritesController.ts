import { Request, Response } from 'express';
import Favorite from '../models/Favorite';
import NotificationSubscription from '../models/NotificationSubscription';

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { adId } = req.body;
    const existing = await Favorite.findOne({
      userTelegramId: req.currentUser.telegramId,
      adId,
    });

    if (existing) {
      await NotificationSubscription.deleteOne({ userTelegramId: req.currentUser.telegramId, adId });
      await existing.deleteOne();
      return res.json({ favorite: false });
    }

    await Favorite.create({
      userTelegramId: req.currentUser.telegramId,
      adId,
      notifyOnPriceChange: true,
      notifyOnStatusChange: true,
    });

    await NotificationSubscription.findOneAndUpdate(
      { userTelegramId: req.currentUser.telegramId, adId },
      { notifyOnPriceChange: true, notifyOnStatusChange: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ favorite: true });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to toggle favorite', error });
  }
};

export const getMyFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const favorites = await Favorite.find({
      userTelegramId: req.currentUser.telegramId,
    }).populate('adId');

    return res.json(favorites);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch favorites', error });
  }
};

export const checkFavorite = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { adId } = req.params;
    const favorite = await Favorite.findOne({
      userTelegramId: req.currentUser.telegramId,
      adId,
    });

    return res.json({ favorite: Boolean(favorite) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to check favorite', error });
  }
};

export const updateNotifySettings = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { adId, notifyOnPriceChange, notifyOnStatusChange } = req.body;

    const favorite = await Favorite.findOneAndUpdate(
      {
        userTelegramId: req.currentUser.telegramId,
        adId,
      },
      {
        notifyOnPriceChange,
        notifyOnStatusChange,
      },
      { new: true }
    );

    await NotificationSubscription.findOneAndUpdate(
      { userTelegramId: req.currentUser.telegramId, adId },
      { notifyOnPriceChange, notifyOnStatusChange },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.json(favorite);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notify settings', error });
  }
};
