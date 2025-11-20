import express from 'express';
import Ad from '../models/Ad';
import User from '../models/User';
import { auth, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.use(auth as express.RequestHandler, requireAdmin as express.RequestHandler);

router.get('/ads', async (req, res) => {
  try {
    const { status, q, ownerPhone } = req.query;
    const filter: Record<string, unknown> = {};

    if (status && typeof status === 'string' && ['pending', 'active', 'blocked'].includes(status)) {
      filter.status = status;
    }

    if (q && typeof q === 'string') {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    if (ownerPhone && typeof ownerPhone === 'string') {
      const owners = await User.find({ phone: { $regex: ownerPhone, $options: 'i' } }).select('_id telegramId');
      const ownerIds = owners.map((o) => o._id);
      const ownerTelegramIds = owners.map((o) => o.telegramId);
      const ownerOrConditions: Record<string, unknown>[] = [];

      if (ownerIds.length) {
        ownerOrConditions.push({ owner: { $in: ownerIds } });
      }
      if (ownerTelegramIds.length) {
        ownerOrConditions.push({ userTelegramId: { $in: ownerTelegramIds } });
      }

      if (ownerOrConditions.length) {
        const andConditions: Record<string, unknown>[] = Array.isArray(filter.$and)
          ? ([...filter.$and] as Record<string, unknown>[])
          : [];
        andConditions.push({ $or: ownerOrConditions });
        filter.$and = andConditions;
      }
    }

    const ads = await Ad.find(filter)
      .populate({ path: 'owner', select: 'firstName lastName username phone role isBlocked telegramId' })
      .sort({ createdAt: -1 });

    return res.json(ads);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ads', error });
  }
});

router.patch('/ads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const ad = await Ad.findByIdAndUpdate(id, { status }, { new: true }).populate({
      path: 'owner',
      select: 'firstName lastName username phone role isBlocked telegramId',
    });

    if (!ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    return res.json(ad);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update ad status', error });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { q, role } = req.query;
    const filter: Record<string, unknown> = {};

    if (q && typeof q === 'string') {
      filter.$or = [
        { phone: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }

    if (role && typeof role === 'string' && ['user', 'admin'].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }

    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user role', error });
  }
});

router.patch('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: 'isBlocked must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(id, { isBlocked }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user block status', error });
  }
});

export default router;
