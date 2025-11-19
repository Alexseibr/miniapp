const crypto = require('crypto');
const config = require('../config/config.js');

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

function telegramAuthMiddleware(req, res, next) {
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

module.exports = {
  validateTelegramInitData,
  telegramAuthMiddleware,
  extractInitDataFromRequest,
};
