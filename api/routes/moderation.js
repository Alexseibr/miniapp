const express = require('express');
const axios = require('axios');
const Ad = require('../../models/Ad');
const User = require('../../models/User');
const config = require('../../config/config');

const router = express.Router();

function parseTelegramId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function extractTelegramId(req) {
  return (
    parseTelegramId(req.body?.telegramId) ||
    parseTelegramId(req.query?.telegramId) ||
    parseTelegramId(req.headers['x-telegram-id'])
  );
}

async function checkModerator(req, res, next) {
  try {
    const telegramId = extractTelegramId(req);

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId обязателен' });
    }

    const user = await User.findOne({ telegramId });

    if (!user || (!user.isModerator && user.role !== 'moderator' && user.role !== 'admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.moderator = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function notifySeller(ad, message) {
  if (!ad || !ad.sellerTelegramId || !config.botToken) {
    return;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      chat_id: ad.sellerTelegramId,
      text: message,
    });
  } catch (error) {
    console.error('Не удалось уведомить продавца:', error.response?.data || error.message);
  }
}

router.get('/pending', checkModerator, async (req, res, next) => {
  try {
    const ads = await Ad.find({ moderationStatus: 'pending' }).sort({ createdAt: 1 });
    res.json({ items: ads });
  } catch (error) {
    next(error);
  }
});

router.post('/approve', checkModerator, async (req, res, next) => {
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
    await ad.save();

    await notifySeller(ad, `🎉 Ваше объявление «${ad.title}» одобрено!`);

    res.json({ item: ad, approved: true });
  } catch (error) {
    next(error);
  }
});

router.post('/reject', checkModerator, async (req, res, next) => {
  try {
    const { adId, comment } = req.body || {};

    if (!adId) {
      return res.status(400).json({ error: 'adId обязателен' });
    }

    const ad = await Ad.findById(adId);

    if (!ad) {
      return res.status(404).json({ error: 'Объявление не найдено' });
    }

    const finalComment = comment && comment.trim() ? comment.trim() : 'Причина не указана';

    ad.moderationStatus = 'rejected';
    ad.moderationComment = finalComment;
    await ad.save();

    await notifySeller(
      ad,
      `⚠️ Ваше объявление «${ad.title}» отклонено.\nПричина: ${finalComment}`,
    );

    res.json({ item: ad, rejected: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
