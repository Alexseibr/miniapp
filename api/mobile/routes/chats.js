import { Router } from 'express';
import { z } from 'zod';
import Conversation from '../../../models/Conversation.js';
import Message from '../../../models/Message.js';
import Ad from '../../../models/Ad.js';
import User from '../../../models/User.js';
import { mobileAuth } from '../middleware/mobileAuth.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';

const router = Router();

const createSchema = z.object({
  adId: z.string(),
});

const messageSchema = z.object({
  text: z.string().min(1),
});

router.use(mobileAuth);

async function findConversationOrError(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    const error = new Error('Диалог не найден');
    error.status = 404;
    throw error;
  }

  const isParticipant = conversation.participants?.some(
    (participantId) => participantId.toString() === userId.toString()
  );
  if (!isParticipant) {
    const error = new Error('Недостаточно прав для этого диалога');
    error.status = 403;
    throw error;
  }

  return conversation;
}

router.post('/', validateBody(createSchema), async (req, res) => {
  try {
    const { adId } = req.validatedBody;
    const buyer = req.currentUser;

    const ad = await Ad.findById(adId).populate({ path: 'owner', select: 'phone telegramUsername telegramId firstName lastName username' });
    if (!ad) {
      return sendError(res, 404, 'NOT_FOUND', 'Объявление не найдено');
    }

    const seller =
      ad.owner ||
      (await User.findOne({ telegramId: ad.sellerTelegramId || ad.userTelegramId }).select(
        'phone telegramUsername telegramId firstName lastName username avatar'
      ));

    if (!seller) {
      return sendError(res, 404, 'NOT_FOUND', 'Продавец не найден');
    }

    if (buyer._id.toString() === seller._id.toString()) {
      return sendError(res, 400, 'SELF_CHAT', 'Нельзя начать чат с самим собой');
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

    return sendSuccess(res, conversation);
  } catch (error) {
    return handleRouteError(res, error, 'CHAT_CREATE_FAILED');
  }
});

router.get('/', async (req, res) => {
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
        const interlocutor = (conversation.participants || []).find(
          (participant) => participant._id.toString() !== userId.toString()
        );
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
      })
    );

    withLastMessage.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return sendSuccess(res, withLastMessage);
  } catch (error) {
    return handleRouteError(res, error, 'CHATS_FETCH_FAILED');
  }
});

router.get('/:conversationId/messages', async (req, res) => {
  try {
    const conversation = await findConversationOrError(req.params.conversationId, req.currentUser._id);
    const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
    return sendSuccess(res, messages);
  } catch (error) {
    return handleRouteError(res, error, 'MESSAGES_FETCH_FAILED');
  }
});

router.post('/:conversationId/messages', validateBody(messageSchema), async (req, res) => {
  try {
    const conversation = await findConversationOrError(req.params.conversationId, req.currentUser._id);
    const message = await Message.create({
      conversation: conversation._id,
      sender: req.currentUser._id,
      text: req.validatedBody.text.trim(),
    });

    conversation.updatedAt = new Date();
    await conversation.save();

    return sendSuccess(res, message);
  } catch (error) {
    return handleRouteError(res, error, 'MESSAGE_SEND_FAILED');
  }
});

export default router;
