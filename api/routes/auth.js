import express from 'express';
import { Router } from 'express';
import crypto from 'crypto';
import User from '../../models/User.js';
import * as config from '../../config/config.js';
import { validateTelegramInitData, extractInitDataFromRequest } from '../../middleware/telegramAuth.js';

const router = Router();

function buildSessionToken(telegramId) {
  const secret = process.env.SESSION_SECRET || config.botToken || 'ketmar-market-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(`${telegramId}:${Date.now()}`)
    .digest('hex');
}

router.post('/telegram', async (req, res) => {
  try {
    console.log('📱 POST /auth/telegram called');
    const initData = extractInitDataFromRequest(req);
    console.log('🔍 InitData extracted:', !!initData);
    const validation = validateTelegramInitData(initData);
    console.log('✅ Validation result:', validation.ok, validation.error);

    if (!validation.ok) {
      console.log('❌ Validation failed:', validation.error);
      return res.status(400).json({ ok: false, error: validation.error || 'Invalid initData' });
    }

    const telegramUser = validation.data.user;
    console.log('👤 Telegram user:', telegramUser);

    if (!telegramUser?.id) {
      console.log('❌ No telegram user ID');
      return res.status(400).json({ ok: false, error: 'Telegram user payload is missing' });
    }

    const updatePayload = {
      telegramId: telegramUser.id,
      username: telegramUser.username || null,
      firstName: telegramUser.first_name || '',
      lastName: telegramUser.last_name || '',
      lastActiveAt: new Date(),
    };

    // Обработка номера телефона если передан
    const phoneFromRequest = req.body?.phone;
    if (phoneFromRequest) {
      updatePayload.phone = phoneFromRequest;
      updatePayload.phoneVerified = true; // Считаем подтвержденным т.к. от Telegram
    }

    let user = await User.findOne({ telegramId: telegramUser.id });

    if (user) {
      user.username = updatePayload.username;
      user.firstName = updatePayload.firstName;
      user.lastName = updatePayload.lastName;
      user.lastActiveAt = updatePayload.lastActiveAt;
      
      // Обновляем телефон если передан
      if (updatePayload.phone) {
        user.phone = updatePayload.phone;
        user.phoneVerified = true;
      }
      
      await user.save();
    } else {
      user = await User.create(updatePayload);
    }

    const sessionToken = buildSessionToken(telegramUser.id);

    const responseData = {
      ok: true,
      token: sessionToken,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
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
    };
    
    console.log('✅ Sending response with user:', responseData.user.telegramId, 'phone:', responseData.user.phone);
    return res.json(responseData);
  } catch (error) {
    console.error('❌ POST /auth/telegram error:', error);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

export default router;
