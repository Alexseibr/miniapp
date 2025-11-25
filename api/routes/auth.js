import express from 'express';
import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';
import SmsCode from '../../models/SmsCode.js';
import * as config from '../../config/config.js';
import { validateTelegramInitData, extractInitDataFromRequest } from '../../middleware/telegramAuth.js';
import authService from '../../services/auth/AuthService.js';

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
    console.log('🔍 InitData length:', initData?.length);
    console.log('🔍 InitData preview:', initData?.substring(0, 100) + '...');
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

/**
 * POST /auth/telegram-init
 * New endpoint using AuthService for Telegram auth with phone linking support
 */
router.post('/telegram-init', async (req, res) => {
  try {
    const { initData, phone } = req.body;
    
    if (!initData) {
      return res.status(400).json({
        success: false,
        error: 'initData is required',
      });
    }
    
    const result = await authService.authenticateTelegram(initData, phone);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Auth API] telegram-init error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
});

/**
 * POST /auth/sms/request
 * Request SMS verification code for login
 */
router.post('/sms/request', async (req, res) => {
  try {
    const { phone, platform } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'phone is required',
      });
    }
    
    const result = await authService.requestSmsCode(phone, 'login', null, platform || 'web');
    
    if (!result.success) {
      const status = result.error === 'too_many_requests' ? 429 : 400;
      return res.status(status).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Auth API] sms/request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
    });
  }
});

/**
 * POST /auth/sms/verify
 * Verify SMS code and authenticate
 */
router.post('/sms/verify', async (req, res) => {
  try {
    const { phone, code, platform } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'phone and code are required',
      });
    }
    
    const result = await authService.verifySmsCode(phone, code, platform || 'web');
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Auth API] sms/verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

/**
 * POST /auth/link-phone/request
 * Request SMS code to link phone to current user
 */
router.post('/link-phone/request', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'phone is required',
      });
    }
    
    const result = await authService.requestSmsCode(phone, 'link_phone', user._id, 'telegram');
    
    if (!result.success) {
      const status = result.error === 'too_many_requests' ? 429 : 400;
      return res.status(status).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Auth API] link-phone/request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send SMS',
    });
  }
});

/**
 * POST /auth/link-phone/verify
 * Verify SMS code and link phone to current user (with account merging)
 */
router.post('/link-phone/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    const { phone, code } = req.body;
    
    if (!phone || !code) {
      return res.status(400).json({
        success: false,
        error: 'phone and code are required',
      });
    }
    
    const result = await authService.linkPhone(user._id, phone, code);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('[Auth API] link-phone/verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Linking failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    return res.json({
      success: true,
      user: authService.sanitizeUser(user),
    });
  } catch (error) {
    console.error('[Auth API] me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    const token = authHeader.substring(7);
    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    const newToken = authService.generateToken(user);
    
    return res.json({
      success: true,
      token: newToken,
      user: authService.sanitizeUser(user),
    });
  } catch (error) {
    console.error('[Auth API] refresh error:', error);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

export default router;
