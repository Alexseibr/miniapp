import { Router } from 'express';
import { z } from 'zod';
import SmsLoginCode from '../../../models/SmsLoginCode.js';
import User from '../../../models/User.js';
import { validateTelegramInitData, extractInitDataFromRequest } from '../../../middleware/telegramAuth.js';
import { generateTokens, verifyRefreshToken } from '../utils/tokens.js';
import { normalizePhone, generateSmsCode } from '../utils/phone.js';
import { validateBody } from '../middleware/validate.js';
import { sendSuccess, sendError, handleRouteError } from '../utils/response.js';
import { ensureNumericUserId, formatUserProfile } from '../utils/user.js';

const router = Router();

const requestCodeSchema = z.object({
  phone: z.string().min(6),
});

const confirmCodeSchema = z.object({
  phone: z.string().min(6),
  code: z.string().min(3),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const telegramSchema = z.object({
  initData: z.string().optional(),
  telegramInitData: z.string().optional(),
  telegramAuthPayload: z.any().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

router.post('/request-code', validateBody(requestCodeSchema), async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.validatedBody.phone);
    if (!normalizedPhone) {
      return sendError(res, 400, 'INVALID_PHONE', 'Укажите корректный номер телефона');
    }

    const code = generateSmsCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await SmsLoginCode.create({ phone: normalizedPhone, code, expiresAt });
    console.log(`📱 [mobile] SMS code for ${normalizedPhone}: ${code}`);

    return sendSuccess(res, { message: 'Код отправлен на указанный номер' });
  } catch (error) {
    return handleRouteError(res, error, 'REQUEST_CODE_FAILED');
  }
});

router.post('/confirm-code', validateBody(confirmCodeSchema), async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.validatedBody.phone);
    const code = String(req.validatedBody.code).trim();

    const loginCode = await SmsLoginCode.findOne({ phone: normalizedPhone, code })
      .sort({ createdAt: -1 })
      .lean();

    if (!loginCode || !loginCode.expiresAt || loginCode.expiresAt < new Date()) {
      return sendError(res, 400, 'INVALID_CODE', 'Код неверен или истёк');
    }

    let user = await User.findOne({ phone: normalizedPhone });
    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        phoneVerified: true,
        firstName: req.validatedBody.firstName || '',
        lastName: req.validatedBody.lastName || '',
      });
    } else {
      user.phoneVerified = true;
      user.firstName = req.validatedBody.firstName || user.firstName;
      user.lastName = req.validatedBody.lastName || user.lastName;
      await user.save();
    }

    await ensureNumericUserId(user);

    const tokens = generateTokens(user);
    await SmsLoginCode.deleteMany({ phone: normalizedPhone });

    return sendSuccess(res, { ...tokens, user: formatUserProfile(user) });
  } catch (error) {
    return handleRouteError(res, error, 'LOGIN_FAILED');
  }
});

router.post('/telegram', validateBody(telegramSchema), async (req, res) => {
  try {
    const initData =
      req.validatedBody.telegramInitData || req.validatedBody.initData || req.validatedBody.telegramAuthPayload;
    const validation = validateTelegramInitData(initData || extractInitDataFromRequest(req));

    if (!validation.ok) {
      return sendError(res, 400, 'INVALID_TELEGRAM_INITDATA', validation.error || 'Invalid initData');
    }

    const telegramUser = validation.data.user;
    if (!telegramUser?.id) {
      return sendError(res, 400, 'INVALID_TELEGRAM_USER', 'Telegram user payload missing');
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
      Object.assign(user, updatePayload);
      await user.save();
    } else {
      user = await User.create(updatePayload);
    }

    await ensureNumericUserId(user);
    const tokens = generateTokens(user);

    return sendSuccess(res, { ...tokens, user: formatUserProfile(user) });
  } catch (error) {
    return handleRouteError(res, error, 'TELEGRAM_LOGIN_FAILED');
  }
});

router.post('/refresh', validateBody(refreshSchema), async (req, res) => {
  try {
    const payload = verifyRefreshToken(req.validatedBody.refreshToken);
    if (payload.type !== 'refresh') {
      return sendError(res, 400, 'INVALID_TOKEN', 'Неверный тип токена');
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return sendError(res, 401, 'USER_NOT_FOUND', 'Пользователь не найден');
    }

    const tokens = generateTokens(user);
    return sendSuccess(res, tokens);
  } catch (error) {
    return sendError(res, 401, 'INVALID_TOKEN', 'Refresh token недействителен');
  }
});

export default router;
