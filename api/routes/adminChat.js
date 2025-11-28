import { Router } from 'express';
import ChatThread from '../../models/ChatThread.js';
import ChatMessage from '../../models/ChatMessage.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import { adminAuth } from '../../middleware/adminAuth.js';

const router = Router();
router.use(adminAuth);

router.get('/threads', async (req, res, next) => {
  try {
    const { userId, adId, from, to, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (userId) {
      filter.$or = [{ buyerId: userId }, { sellerId: userId }];
    }
    if (adId) {
      filter.adId = adId;
    }
    if (from || to) {
      filter.lastMessageAt = {};
      if (from) filter.lastMessageAt.$gte = new Date(from);
      if (to) filter.lastMessageAt.$lte = new Date(to);
    }

    const threads = await ChatThread.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const userIds = threads.flatMap((t) => [t.buyerId, t.sellerId]);
    const adIds = threads.map((t) => t.adId);
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName username');
    const ads = await Ad.find({ _id: { $in: adIds } }).select('title');

    const result = await Promise.all(
      threads.map(async (thread) => {
        const buyer = users.find((u) => u._id.toString() === thread.buyerId.toString());
        const seller = users.find((u) => u._id.toString() === thread.sellerId.toString());
        const ad = ads.find((a) => a._id.toString() === thread.adId.toString());
        const messageCount = await ChatMessage.countDocuments({ threadId: thread._id });
        return {
          id: thread._id,
          buyer: buyer
            ? { id: buyer._id, name: `${buyer.firstName || ''} ${buyer.lastName || buyer.username || ''}`.trim() }
            : null,
          seller: seller
            ? { id: seller._id, name: `${seller.firstName || ''} ${seller.lastName || seller.username || ''}`.trim() }
            : null,
          ad: ad ? { id: ad._id, title: ad.title } : null,
          messageCount,
          lastMessageAt: thread.lastMessageAt,
        };
      })
    );

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ threadId: req.params.threadId }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

export default router;
