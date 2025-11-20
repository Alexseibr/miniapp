const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const PendingTelegramLogin = require('../../models/PendingTelegramLogin');
const User = require('../../models/User');

const router = express.Router();

const DEFAULT_EXPIRATION_MINUTES = 10;

function buildDeepLink(token) {
  const botUsername =
    process.env.TELEGRAM_BOT_USERNAME ||
    process.env.BOT_USERNAME ||
    process.env.TELEGRAM_BOT_NAME ||
    process.env.BOT_NAME;

  const encodedToken = encodeURIComponent(token);
  if (!botUsername) {
    return `https://t.me/?start=login_${encodedToken}`;
  }
  return `https://t.me/${botUsername}?start=login_${encodedToken}`;
}

function formatUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user._id,
    phone: user.phone || null,
    telegramId: user.telegramId || null,
    telegramUsername: user.telegramUsername || user.username || null,
    username: user.username || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    role: user.role || 'user',
  };
}

router.post('/create-session', async (req, res) => {
  try {
    const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRATION_MINUTES * 60 * 1000);

    await PendingTelegramLogin.create({
      token,
      expiresAt,
      status: 'pending',
    });

    const deepLink = buildDeepLink(token);

    return res.json({ token, deepLink });
  } catch (error) {
    console.error('Failed to create telegram login session', error);
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const internalSecret = process.env.INTERNAL_AUTH_SECRET;
    if (internalSecret && req.headers['x-internal-secret'] !== internalSecret) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const { token, telegramId, username, firstName, lastName, phone } = req.body || {};

    if (!token || !telegramId) {
      return res.status(400).json({ ok: false, error: 'token and telegramId are required' });
    }

    const pending = await PendingTelegramLogin.findOne({ token });

    if (!pending || pending.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Login session not found or already processed' });
    }

    if (pending.expiresAt && pending.expiresAt.getTime() < Date.now()) {
      pending.status = 'expired';
      await pending.save();
      return res.status(400).json({ ok: false, error: 'Login session expired' });
    }

    const normalizedTelegramId = String(telegramId);
    const normalizedPhone = phone ? String(phone).trim() : undefined;

    let user = await User.findOne({ telegramId: normalizedTelegramId });

    if (user) {
      user.username = username || user.username;
      user.telegramUsername = username || user.telegramUsername;
      user.firstName = firstName || user.firstName;
      user.lastName = lastName || user.lastName;
      if (!user.phone && normalizedPhone) {
        user.phone = normalizedPhone;
      }
      await user.save();
    } else if (normalizedPhone) {
      user = await User.findOne({ phone: normalizedPhone });
      if (user) {
        user.telegramId = normalizedTelegramId;
        user.telegramUsername = username || user.telegramUsername;
        user.username = username || user.username;
        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        telegramId: normalizedTelegramId,
        telegramUsername: username || null,
        username: username || null,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: normalizedPhone,
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ ok: false, error: 'Auth is not configured' });
    }

    const signedToken = jwt.sign({ id: user._id, role: user.role }, jwtSecret, { expiresIn: '7d' });

    pending.status = 'completed';
    pending.user = user._id;
    pending.jwtToken = signedToken;
    pending.telegramId = normalizedTelegramId;
    pending.telegramUsername = username || null;
    pending.phone = normalizedPhone;
    pending.completedAt = new Date();
    await pending.save();

    return res.json({ ok: true });
  } catch (error) {
    console.error('Failed to confirm telegram login', error);
    return res.status(500).json({ ok: false, error: 'Failed to confirm login' });
  }
});

router.get('/poll', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ status: 'invalid_token' });
    }

    const pending = await PendingTelegramLogin.findOne({ token });

    if (!pending) {
      return res.status(404).json({ status: 'not_found' });
    }

    if (pending.status === 'pending' && pending.expiresAt && pending.expiresAt.getTime() < Date.now()) {
      pending.status = 'expired';
      await pending.save();
    }

    if (pending.status === 'expired') {
      return res.status(410).json({ status: 'expired' });
    }

    if (pending.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    const user = pending.user ? await User.findById(pending.user) : null;

    return res.json({
      status: 'completed',
      jwtToken: pending.jwtToken,
      user: formatUser(user),
    });
  } catch (error) {
    console.error('Failed to poll telegram login session', error);
    return res.status(500).json({ status: 'error', error: 'Failed to poll session' });
  }
});

module.exports = router;
