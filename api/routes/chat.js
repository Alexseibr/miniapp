import { Router } from 'express';
import ChatThread from '../../models/ChatThread.js';
import ChatMessage from '../../models/ChatMessage.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import { auth } from '../../middleware/auth.js';
import { broadcastChatEvent } from '../../services/chatSocket.js';

const router = Router();
router.use(auth);

function sanitizeMessageForUser(message, role) {
  if (!message) return null;
  const plain = message.toObject ? message.toObject() : { ...message };
  if (plain.isHiddenFor) {
    if (role === 'buyer') {
      delete plain.isHiddenFor.buyer;
    }
    if (role === 'seller') {
      delete plain.isHiddenFor.seller;
    }
  }
  return plain;
}

async function ensureThreadAccess(threadId, userId) {
  const thread = await ChatThread.findById(threadId);
  if (!thread) {
    const error = new Error('Тред не найден');
    error.status = 404;
    throw error;
  }
  const isBuyer = thread.buyerId?.toString() === userId.toString();
  const isSeller = thread.sellerId?.toString() === userId.toString();
  if (!isBuyer && !isSeller) {
    const error = new Error('Нет доступа к этому треду');
    error.status = 403;
    throw error;
  }
  return { thread, role: isBuyer ? 'buyer' : 'seller' };
}

async function buildThreadResponse(thread, currentUserId) {
  const ad = await Ad.findById(thread.adId).select('title price photos images');
  const users = await User.find({
    _id: { $in: [thread.buyerId, thread.sellerId] },
  }).select('firstName lastName username telegramUsername avatar');
  const buyer = users.find((u) => u._id.toString() === thread.buyerId.toString());
  const seller = users.find((u) => u._id.toString() === thread.sellerId.toString());
  const isBuyer = currentUserId.toString() === thread.buyerId.toString();
  const counterpart = isBuyer ? seller : buyer;
  return {
    _id: thread._id,
    ad: ad
      ? {
          _id: ad._id,
          title: ad.title,
          price: ad.price,
          images: ad.images || ad.photos,
        }
      : null,
    buyer: buyer ? { ...buyer.toObject(), id: buyer._id } : null,
    seller: seller ? { ...seller.toObject(), id: seller._id } : null,
    counterpart: counterpart ? { ...counterpart.toObject(), id: counterpart._id } : null,
    lastMessageText: thread.lastMessageText,
    lastMessageAt: thread.lastMessageAt,
    unreadCount: isBuyer ? thread.unreadForBuyer : thread.unreadForSeller,
    status: thread.status,
  };
}

router.post('/threads', async (req, res, next) => {
  try {
    const { adId } = req.body || {};
    const buyerId = req.currentUser._id;

    if (!adId) {
      return res.status(400).json({ message: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId).populate('owner');
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    const seller =
      ad.owner ||
      (await User.findById(ad.user)) ||
      (await User.findOne({ telegramId: ad.sellerTelegramId || ad.userTelegramId }));

    if (!seller) {
      return res.status(400).json({ message: 'Продавец не найден' });
    }

    if (buyerId.toString() === seller._id.toString()) {
      return res.status(400).json({ message: 'Нельзя писать самому себе' });
    }

    let thread = await ChatThread.findOne({ adId, buyerId, sellerId: seller._id });

    if (!thread) {
      thread = await ChatThread.create({
        adId,
        buyerId,
        sellerId: seller._id,
        lastMessageAt: new Date(),
        status: 'active',
      });
    }

    const response = await buildThreadResponse(thread, buyerId);
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.get('/threads', async (req, res, next) => {
  try {
    const { roleFilter = 'all', limit = 20, offset = 0 } = req.query;
    const userId = req.currentUser._id;
    const filter = { $or: [] };

    if (roleFilter === 'buyer' || roleFilter === 'all') {
      filter.$or.push({ buyerId: userId });
    }
    if (roleFilter === 'seller' || roleFilter === 'all') {
      filter.$or.push({ sellerId: userId });
    }

    if (filter.$or.length === 0) {
      filter.$or.push({ buyerId: userId }, { sellerId: userId });
    }

    const threads = await ChatThread.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const enriched = await Promise.all(threads.map((thread) => buildThreadResponse(thread, userId)));

    return res.json(enriched);
  } catch (error) {
    return next(error);
  }
});

router.get('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const { thread, role } = await ensureThreadAccess(req.params.threadId, req.currentUser._id);
    const { limit = 50, beforeDate } = req.query;
    const query = { threadId: thread._id };

    if (beforeDate) {
      const parsed = new Date(beforeDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Неверная дата пагинации' });
      }
      query.createdAt = { $lt: parsed };
    }

    if (role === 'buyer') {
      query['isHiddenFor.buyer'] = { $ne: true };
    } else {
      query['isHiddenFor.seller'] = { $ne: true };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(Number(limit));

    return res.json(messages.map((message) => sanitizeMessageForUser(message, role)));
  } catch (error) {
    return next(error);
  }
});

router.post('/threads/:threadId/messages', async (req, res, next) => {
  try {
    const { text, attachments = [] } = req.body || {};
    const { thread, role } = await ensureThreadAccess(req.params.threadId, req.currentUser._id);

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Нужно передать текст или вложения' });
    }

    const isBuyer = role === 'buyer';
    const fromUserId = req.currentUser._id;
    const toUserId = isBuyer ? thread.sellerId : thread.buyerId;

    const message = await ChatMessage.create({
      threadId: thread._id,
      fromUserId,
      toUserId,
      adId: thread.adId,
      text: text?.trim(),
      attachments,
      meta: {
        deliveredAt: new Date(),
        deliveredTo: [toUserId.toString()],
      },
      isHiddenFor: { buyer: false, seller: false },
    });

    const lastMessageText = message.text || (message.attachments?.length ? 'Вложение' : '');
    if (isBuyer) {
      thread.unreadForSeller += 1;
    } else {
      thread.unreadForBuyer += 1;
    }
    thread.lastMessageText = lastMessageText;
    thread.lastMessageAt = message.createdAt;
    await thread.save();

    const sanitized = sanitizeMessageForUser(message, role);
    broadcastChatEvent(thread._id.toString(), 'chat:message:new', sanitized);
    broadcastChatEvent(thread._id.toString(), 'chat:thread:update', {
      lastMessageText,
      lastMessageAt: message.createdAt,
      unreadForBuyer: thread.unreadForBuyer,
      unreadForSeller: thread.unreadForSeller,
    });

    return res.status(201).json(sanitized);
  } catch (error) {
    return next(error);
  }
});

router.post('/messages/:messageId/read', async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }

    const { thread, role } = await ensureThreadAccess(message.threadId, req.currentUser._id);
    const userId = req.currentUser._id.toString();
    const readBy = new Set([...(message.meta.readBy || [])]);
    readBy.add(userId);
    message.meta.readBy = Array.from(readBy);
    message.meta.readAt = message.meta.readAt || new Date();
    await message.save();

    if (role === 'buyer') {
      thread.unreadForBuyer = Math.max(0, (thread.unreadForBuyer || 0) - 1);
    } else {
      thread.unreadForSeller = Math.max(0, (thread.unreadForSeller || 0) - 1);
    }
    await thread.save();

    broadcastChatEvent(thread._id.toString(), 'chat:message:read', {
      messageId: message._id,
      readBy: message.meta.readBy,
      readAt: message.meta.readAt,
    });
    broadcastChatEvent(thread._id.toString(), 'chat:thread:update', {
      unreadForBuyer: thread.unreadForBuyer,
      unreadForSeller: thread.unreadForSeller,
    });

    return res.json(message);
  } catch (error) {
    return next(error);
  }
});

router.post('/messages/:messageId/hide', async (req, res, next) => {
  try {
    const message = await ChatMessage.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: 'Сообщение не найдено' });
    }

    const { role, thread } = await ensureThreadAccess(message.threadId, req.currentUser._id);
    if (role === 'buyer') {
      message.isHiddenFor.buyer = true;
    } else {
      message.isHiddenFor.seller = true;
    }

    await message.save();
    broadcastChatEvent(thread._id.toString(), 'chat:message:hidden', {
      messageId: message._id,
      role,
    });

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
