import { Router } from 'express';
import Conversation from '../../models/Conversation.js';
import Message from '../../models/Message.js';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import { auth } from '../../middleware/auth.js';

const router = Router();
router.use(auth);

async function findConversationOrError(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Диалог не найден');
    error.status = 404;
    throw error;
  }

  const isParticipant = conversation.participants?.some((participantId) => participantId.toString() === userId.toString());
  if (!isParticipant) {
    const error = new Error('Недостаточно прав для этого диалога');
    error.status = 403;
    throw error;
  }

  return conversation;
}

router.post('/start', async (req, res, next) => {
  try {
    const { adId } = req.body || {};
    const buyer = req.currentUser;

    if (!adId) {
      return res.status(400).json({ message: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId).populate({ path: 'owner', select: 'phone telegramUsername telegramId firstName lastName username' });
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    const seller =
      ad.owner ||
      (await User.findOne({ telegramId: ad.sellerTelegramId || ad.userTelegramId }).select('phone telegramUsername telegramId firstName lastName username'));

    if (!seller) {
      return res.status(404).json({ message: 'Продавец не найден' });
    }

    if (buyer._id.toString() === seller._id.toString()) {
      return res.status(400).json({ message: 'Нельзя начать чат с самим собой' });
    }

    const participantIds = [buyer._id.toString(), seller._id.toString()].sort();

    let conversation = await Conversation.findOne({
      ad: ad._id,
      participants: { $all: participantIds, $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({ ad: ad._id, participants: participantIds });
    }

    await conversation.populate([
      { path: 'ad', select: 'title price photos images owner' },
      { path: 'participants', select: 'phone telegramUsername firstName lastName username avatar' },
    ]);

    return res.json(conversation);
  } catch (error) {
    return next(error);
  }
});

router.get('/my', async (req, res, next) => {
  try {
    const userId = req.currentUser._id;
    const conversations = await Conversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate({ path: 'ad', select: 'title price photos images' })
      .populate({ path: 'participants', select: 'phone telegramUsername firstName lastName username avatar' })
      .lean();

    const withLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({ conversation: conversation._id }).sort({ createdAt: -1 }).lean();
        const interlocutor = (conversation.participants || []).find((participant) => participant._id.toString() !== userId.toString());
        return {
          _id: conversation._id,
          ad: conversation.ad
            ? {
                _id: conversation.ad._id,
                title: conversation.ad.title,
                price: conversation.ad.price,
                images: conversation.ad.images || conversation.ad.photos,
              }
            : null,
          interlocutor: interlocutor
            ? {
                _id: interlocutor._id,
                phone: interlocutor.phone,
                telegramUsername: interlocutor.telegramUsername,
                firstName: interlocutor.firstName,
                lastName: interlocutor.lastName,
                username: interlocutor.username,
                avatar: interlocutor.avatar,
              }
            : null,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
                sender: lastMessage.sender,
              }
            : null,
        };
      }),
    );

    withLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return res.json(withLastMessage);
  } catch (error) {
    return next(error);
  }
});

router.get('/:conversationId/messages', async (req, res, next) => {
  try {
    const conversation = await findConversationOrError(req.params.conversationId, req.currentUser._id);
    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

router.post('/:conversationId/messages', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Текст сообщения обязателен' });
    }

    const conversation = await findConversationOrError(req.params.conversationId, req.currentUser._id);
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.currentUser._id,
      text: text.trim(),
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    return res.status(201).json(message);
  } catch (error) {
    return next(error);
  }
});

router.get('/:conversationId/poll', async (req, res, next) => {
  try {
    const { since } = req.query || {};
    const sinceDate = since ? new Date(since) : null;

    if (since && Number.isNaN(sinceDate?.getTime())) {
      return res.status(400).json({ message: 'Некорректный параметр времени' });
    }

    const conversation = await findConversationOrError(req.params.conversationId, req.currentUser._id);

    const query = { conversation: conversation._id };
    if (sinceDate) {
      query.createdAt = { $gt: sinceDate };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });
    const lastMessage = messages[messages.length - 1];

    return res.json({
      messages,
      newSince: lastMessage?.createdAt || since || null,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
