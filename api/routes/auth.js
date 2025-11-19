const express = require('express');
const crypto = require('crypto');
const User = require('../../models/User.js');
const config = require('../../config/config.js');
const { validateTelegramInitData, extractInitDataFromRequest } = require('../../middleware/telegramAuth.js');

const router = express.Router();

function buildSessionToken(telegramId) {
  const secret = process.env.SESSION_SECRET || config.botToken || 'ketmar-market-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${telegramId}:${Date.now()}`)
    .digest('hex');
}

router.post('/telegram', async (req, res) => {
  try {
    const initData = extractInitDataFromRequest(req);
    const validation = validateTelegramInitData(initData);

    if (!validation.ok) {
      return res.status(400).json({ ok: false, error: validation.error || 'Invalid initData' });
    }

    const telegramUser = validation.data.user;

    if (!telegramUser?.id) {
      return res.status(400).json({ ok: false, error: 'Telegram user payload is missing' });
    }

    const updatePayload = {
      telegramId: telegramUser.id,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || '',
      lastName: telegramUser.last_name || '',
      lastActiveAt: new Date(),
    };

    let user = await User.findOne({ telegramId: telegramUser.id });

    if (user) {
      user.username = updatePayload.username;
      user.firstName = updatePayload.firstName;
      user.lastName = updatePayload.lastName;
      user.lastActiveAt = updatePayload.lastActiveAt;
      await user.save();
    } else {
      user = await User.create(updatePayload);
    }

    const sessionToken = buildSessionToken(telegramUser.id);

    return res.json({
      ok: true,
      token: sessionToken,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneVerified: user.phoneVerified,
        role: user.role,
        privacy: user.privacy,
      },
      telegram: {
        id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        language_code: telegramUser.language_code,
      },
      auth: {
        authDate: validation.data.authDate,
        hash: validation.data.payload?.hash,
      },
    });
  } catch (error) {
    console.error('POST /auth/telegram error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
