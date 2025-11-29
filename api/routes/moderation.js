import express from 'express';
import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import Ad from '../../models/Ad.js';
import User from '../../models/User.js';
import * as config from '../../config/config.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = '1h';

function parseTelegramId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getAuthenticatedTelegramId(req) {
  return parseTelegramId(req.telegramAuth?.user?.id);
}

function verifyJWT(token) {
  try {
    if (!JWT_SECRET) {
      return null;
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

async function checkModerator(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const token = authHeader.slice(7);
    const decoded = verifyJWT(token);
    
    if (!decoded || !decoded.telegramId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const telegramId = parseTelegramId(decoded.telegramId);
    
    if (!telegramId) {
      return res.status(401).json({ error: 'Invalid telegramId in token' });
    }

    const user = await User.findOne({ telegramId });

    if (!user || (!user.isModerator && user.role !== 'moderator' && user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.moderator = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function notifySeller(ad, message, options = {}) {
  if (!ad || !ad.sellerTelegramId || !config.botToken) {
    return;
  }

  try {
    const botUsername = process.env.BOT_USERNAME || 'KetmarM_bot';
    const payload = {
      chat_id: ad.sellerTelegramId,
      text: message,
      parse_mode: 'HTML',
      ...options,
    };
    
    await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, payload);
    console.log(`[Moderation] Notification sent to seller ${ad.sellerTelegramId}`);
  } catch (error) {
    console.error('Не удалось уведомить продавца:', error.response?.data || error.message);
  }
}

router.post('/token', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    
    const providedToken = authHeader.slice(7);
    
    if (providedToken !== config.botToken) {
      return res.status(401).json({ error: 'Invalid bot token' });
    }
    
    const { telegramId } = req.body || {};
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const numericId = parseTelegramId(telegramId);
    
    if (!numericId) {
      return res.status(400).json({ error: 'Invalid telegramId' });
    }
    
    const user = await User.findOne({ telegramId: numericId });
    
    if (!user || (!user.isModerator && user.role !== 'moderator' && user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'User is not a moderator' });
    }
    
    const token = jwt.sign(
      { telegramId: numericId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({ token, expiresIn: JWT_EXPIRES_IN });
  } catch (error) {
    next(error);
  }
});

router.get('/pending', async (req, res, next) => {
  try {
    const ads = await Ad.find({ moderationStatus: 'pending' }).sort({ createdAt: 1 });
    res.json({ items: ads });
  } catch (error) {
    next(error);
  }
});

router.post('/approve', async (req, res, next) => {
  try {
    const { adId } = req.body || {};

    if (!adId) {
      return res.status(400).json({ error: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    ad.moderationStatus = 'approved';
    ad.moderationComment = null;
    ad.moderationAt = new Date();
    
    if (ad.status === 'draft' || ad.status === 'pending') {
      ad.status = 'active';
    }
    
    await ad.save();

    const botUsername = process.env.BOT_USERNAME || 'KetmarM_bot';
    const message = `✅ <b>Объявление одобрено!</b>\n\n` +
      `📝 «${ad.title}»\n\n` +
      `Ваше объявление успешно прошло модерацию и теперь доступно покупателям.`;
    
    await notifySeller(ad, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👀 Посмотреть', url: `https://t.me/${botUsername}/miniapp?startapp=ad_${adId}` }],
          [{ text: '✏️ Редактировать', url: `https://t.me/${botUsername}/miniapp?startapp=edit_${adId}` }],
          [{ text: '📋 Мои объявления', url: `https://t.me/${botUsername}/miniapp?startapp=myads` }],
        ],
      },
    });

    res.json({ item: ad, approved: true });
  } catch (error) {
    next(error);
  }
});

router.post('/reject', async (req, res, next) => {
  try {
    const { adId, comment } = req.body || {};

    if (!adId) {
      return res.status(400).json({ error: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const finalComment = comment && comment.trim() ? comment.trim() : 'Требуется доработка';

    ad.moderationStatus = 'rejected';
    ad.moderationComment = finalComment;
    ad.moderationAt = new Date();
    await ad.save();

    const botUsername = process.env.BOT_USERNAME || 'KetmarM_bot';
    const message = `⚠️ <b>Объявление требует доработки</b>\n\n` +
      `📝 «${ad.title}»\n\n` +
      `<b>Причина:</b>\n${finalComment}\n\n` +
      `Пожалуйста, внесите изменения и повторно опубликуйте объявление.`;
    
    await notifySeller(ad, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👀 Посмотреть', url: `https://t.me/${botUsername}/miniapp?startapp=ad_${adId}` }],
          [{ text: '✏️ Редактировать', url: `https://t.me/${botUsername}/miniapp?startapp=edit_${adId}` }],
          [{ text: '📋 Мои объявления', url: `https://t.me/${botUsername}/miniapp?startapp=myads` }],
        ],
      },
    });

    res.json({ item: ad, rejected: true });
  } catch (error) {
    next(error);
  }
});

export default router;
