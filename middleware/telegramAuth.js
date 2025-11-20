const crypto = require('crypto');
const config = require('../config/config.js');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

async function attachUserFromJwt(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (!token || scheme?.toLowerCase() !== 'bearer') {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.warn('JWT_SECRET is not configured for JWT authorization');
    return null;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (!payload?.id) {
      return null;
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return null;
    }

    req.currentUser = user;
    req.jwtPayload = payload;
    req.authMethod = 'jwt';
    req.user = user;

    if (user.telegramId) {
      const telegramUser = {
        id: user.telegramId,
        username: user.username || user.telegramUsername,
      };
      req.telegramAuth = { user: telegramUser };
      req.telegramUser = telegramUser;
    }

    return user;
  } catch (error) {
    console.warn('Failed to verify JWT token', error.message);
    throw error;
  }
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

function validateTelegramInitData(rawInitData) {
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

function extractInitDataFromRequest(req) {
  return (
    req.headers['x-telegram-init-data'] ||
    req.body?.initData ||
    req.query?.initData ||
    null
  );
}

async function telegramAuthMiddleware(req, res, next) {
  try {
    const userFromJwt = await attachUserFromJwt(req);
    if (userFromJwt) {
      return next();
    }
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

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

async function telegramInitDataMiddleware(req, res, next) {
  try {
    const jwtUser = await attachUserFromJwt(req);
    if (jwtUser) {
      return next();
    }
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
      telegramUsername: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      // username сохраняем как алиас telegramUsername для обратной совместимости
      username: telegramUser.username,
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
    req.user = userDoc;
    req.telegramUser = telegramUser;
    return next();
  } catch (error) {
    console.error('Failed to upsert Telegram user', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  validateTelegramInitData,
  telegramAuthMiddleware,
  extractInitDataFromRequest,
  telegramInitDataMiddleware,
};
