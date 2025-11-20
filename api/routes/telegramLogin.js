const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const PendingTelegramLogin = require('../../models/PendingTelegramLogin');
const User = require('../../models/User');
const { formatUser } = require('../../utils/formatUser');

const router = express.Router();

function buildLoginToken() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString('hex');
}

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone)
    .trim()
    .replace(/[^+\d]/g, '')
    .replace(/^8/, '+7');
}

function buildJwt(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function buildDeepLink(token) {
  const username =
    process.env.TELEGRAM_BOT_USERNAME ||
    process.env.BOT_USERNAME ||
    process.env.BOT_NAME ||
    process.env.TELEGRAM_BOT_NAME;
  const botUsername = username || 'telegram';
  return `https://t.me/${botUsername}?start=login_${token}`;
}

router.post('/create-session', async (_req, res) => {
  try {
    const token = buildLoginToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingTelegramLogin.create({ token, expiresAt, status: 'pending' });

    return res.json({ token, deepLink: buildDeepLink(token) });
  } catch (error) {
    console.error('create-session error', error);
    return res.status(500).json({ message: 'Не удалось создать сессию входа' });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const secret = process.env.INTERNAL_AUTH_SECRET;
    if (!secret || req.header('X-Internal-Secret') !== secret) {
      return res.status(403).json({ message: 'Недостаточно прав' });
    }

    const { token, telegramId, username, firstName, lastName, phone } = req.body || {};

    if (!token || !telegramId || !phone) {
      return res.status(400).json({ message: 'Не хватает данных для подтверждения' });
    }

    const pending = await PendingTelegramLogin.findOne({ token, status: 'pending' });
    if (!pending || pending.expiresAt < new Date()) {
      if (pending && pending.status === 'pending') {
        pending.status = 'expired';
        await pending.save();
      }
      return res.status(400).json({ message: 'Сессия не найдена или истекла' });
    }

    const normalizedPhone = normalizePhone(phone);

    let user = await User.findOne({ telegramId: String(telegramId) });

    if (!user && normalizedPhone) {
      user = await User.findOne({ phone: normalizedPhone });
      if (user) {
        user.telegramId = String(telegramId);
        user.telegramUsername = username || null;
      }
    }

    if (!user) {
      user = await User.create({
        phone: normalizedPhone || undefined,
        telegramId: String(telegramId),
        telegramUsername: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
      });
    } else {
      user.telegramId = String(telegramId);
      user.telegramUsername = username || user.telegramUsername;
      user.firstName = user.firstName || firstName || null;
      user.lastName = user.lastName || lastName || null;
      if (!user.phone) {
        user.phone = normalizedPhone;
      }
      await user.save();
    }

    const jwtToken = buildJwt(user);

    pending.status = 'completed';
    pending.user = user._id;
    pending.jwtToken = jwtToken;
    pending.telegramId = String(telegramId);
    pending.telegramUsername = username || null;
    pending.phone = normalizedPhone;
    pending.completedAt = new Date();
    await pending.save();

    return res.json({ ok: true });
  } catch (error) {
    console.error('confirm error', error);
    return res.status(500).json({ message: 'Не удалось подтвердить вход' });
  }
});

router.get('/poll', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.json({ status: 'not_found' });
    }

    const pending = await PendingTelegramLogin.findOne({ token }).populate('user');

    if (!pending) {
      return res.json({ status: 'not_found' });
    }

    if (pending.expiresAt < new Date()) {
      if (pending.status === 'pending') {
        pending.status = 'expired';
        await pending.save();
      }
      return res.json({ status: 'not_found' });
    }

    if (pending.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (pending.status === 'completed') {
      return res.json({
        status: 'completed',
        jwtToken: pending.jwtToken,
        user: formatUser(pending.user),
      });
    }

    return res.json({ status: 'not_found' });
  } catch (error) {
    console.error('poll error', error);
    return res.status(500).json({ status: 'not_found' });
  }
});

module.exports = router;
