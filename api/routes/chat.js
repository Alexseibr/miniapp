const { Router } = require('express');
const Conversation = require('../../models/Conversation');
const Message = require('../../models/Message');
const Ad = require('../../models/Ad');
const User = require('../../models/User');
const { telegramInitDataMiddleware } = require('../../middleware/telegramAuth');
const requireAuth = require('../../middleware/requireAuth');

const router = Router();
router.use(telegramInitDataMiddleware, requireAuth);

async function loadConversation(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Диалог не найден');
    error.status = 404;
    throw error;
  }

  const isParticipant =
    conversation.buyer?.toString() === userId.toString() ||
    conversation.seller?.toString() === userId.toString();

  if (!isParticipant) {
    const error = new Error('Недостаточно прав для этого диалога');
    error.status = 403;
    throw error;
  }

  return conversation;
}

router.post('/conversations', async (req, res, next) => {
  try {
    const { adId } = req.body || {};
    const buyer = req.currentUser;

    if (!adId) {
      return res.status(400).json({ message: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId);
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    const seller = await User.findOne({ telegramId: ad.sellerTelegramId });
    if (!seller) {
      return res.status(404).json({ message: 'Продавец не найден' });
    }

    let conversation = await Conversation.findOne({
      ad: ad._id,
      buyer: buyer._id,
      seller: seller._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({ ad: ad._id, buyer: buyer._id, seller: seller._id });
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const conversation = await loadConversation(req.params.id, req.currentUser._id);
    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Текст сообщения обязателен' });
    }

    const conversation = await loadConversation(req.params.id, req.currentUser._id);
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.currentUser._id,
      text: text.trim(),
    });

    await Conversation.updateOne({ _id: conversation._id }, { updatedAt: new Date() });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

router.get('/my', async (req, res, next) => {
  try {
    const userId = req.currentUser._id;
    const conversations = await Conversation.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate('ad');

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({ conversation: conversation._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          ...conversation.toObject(),
          lastMessage,
        };
      }),
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
