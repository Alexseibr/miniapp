import { Request, Response } from 'express';
import Favorite from '../models/Favorite';

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
      await existing.deleteOne();
      return res.json({ favorite: false });
    }

    await Favorite.create({
      userTelegramId: req.currentUser.telegramId,
      adId,
    });

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

    const updated = await Favorite.findOneAndUpdate(
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

    if (!updated) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update notify settings', error });
  }
};
