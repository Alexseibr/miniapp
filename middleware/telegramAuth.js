import crypto from 'crypto';
import * as config from '../config/config.js';
import User from '../models/User.js';

const DEFAULT_TTL_SECONDS = Number(process.env.TELEGRAM_INITDATA_TTL || 60 * 60 * 24); // 24 часа по умолчанию

function buildDataCheckString(searchParams) {
  const pairs = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === 'hash') {
      continue;
    }
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  return pairs.join('\n');
}

function safeJsonParse(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse Telegram initData JSON field', { value, error: error.message });
    return undefined;
  }
}

export function validateTelegramInitData(rawInitData) {
  if (!rawInitData || typeof rawInitData !== 'string') {
    return { ok: false, error: 'initData is required' };
  }

  const searchParams = new URLSearchParams(rawInitData);
  const hash = searchParams.get('hash');

  if (!hash) {
    return { ok: false, error: 'hash parameter is missing in initData' };
  }

  const dataCheckString = buildDataCheckString(searchParams);
  const secretKey = crypto.createHash('sha256').update(config.botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    return { ok: false, error: 'Invalid Telegram signature' };
  }

  const authDate = Number(searchParams.get('auth_date'));
  if (Number.isFinite(authDate)) {
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > DEFAULT_TTL_SECONDS) {
      return { ok: false, error: 'initData is expired' };
    }
  }

  const payload = {};
  for (const [key, value] of searchParams.entries()) {
    payload[key] = value;
  }

  const user = safeJsonParse(payload.user);

  return {
    ok: true,
    data: {
      payload,
      user,
      authDate: authDate || null,
    },
    rawInitData,
  };
}

export function extractInitDataFromRequest(req) {
  return (
    req.headers['x-telegram-init-data'] ||
    req.body?.initData ||
    req.query?.initData ||
    null
  );
}

export function telegramAuthMiddleware(req, res, next) {
  const initData = extractInitDataFromRequest(req);
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return res.status(401).json({ ok: false, error: validation.error || 'Unauthorized' });
  }

  req.telegramAuth = {
    initData: validation.rawInitData,
    ...validation.data,
  };

  if (validation.data?.user?.id) {
    req.telegramUser = validation.data.user;
  }

  return next();
}

export async function telegramInitDataMiddleware(req, res, next) {
  const initData = extractInitDataFromRequest(req);
  const validation = validateTelegramInitData(initData);

  if (!validation.ok) {
    return res.status(401).json({ error: 'Invalid Telegram initData' });
  }

  const telegramUser = validation.data?.user;

  if (!telegramUser || !telegramUser.id) {
    return res.status(401).json({ error: 'Invalid Telegram initData' });
  }

  try {
    const update = {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    };

    const userDoc = await User.findOneAndUpdate(
      { telegramId: telegramUser.id },
      {
        $set: update,
        $setOnInsert: {
          favoritesCount: 0,
          ordersCount: 0,
        },
      },
      { upsert: true, new: true }
    );

    req.currentUser = userDoc;
    return next();
  } catch (error) {
    console.error('Failed to upsert Telegram user', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
