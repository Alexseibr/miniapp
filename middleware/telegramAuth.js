import crypto from 'crypto';
import User from '../models/User.js';

const DEFAULT_TTL_SECONDS = Number(process.env.TELEGRAM_INITDATA_TTL || 60 * 60 * 24); // 24 часа по умолчанию
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

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

/**
 * Validates Telegram WebApp initData signature using HMAC-SHA256
 * According to Telegram docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function verifyTelegramSignature(rawInitData, hash) {
  if (!BOT_TOKEN) {
    console.warn('[TelegramAuth] BOT_TOKEN not configured, signature validation skipped');
    return true; // Skip validation if no token (development mode)
  }

  try {
    const searchParams = new URLSearchParams(rawInitData);
    
    // Remove hash from params and sort remaining params alphabetically
    const dataCheckArr = [];
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'hash') {
        dataCheckArr.push(`${key}=${value}`);
      }
    }
    dataCheckArr.sort();
    
    // Create data-check-string
    const dataCheckString = dataCheckArr.join('\n');
    
    // Create secret key: HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    
    // Calculate hash: HMAC_SHA256(data_check_string, secret_key)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Compare hashes (constant-time comparison to prevent timing attacks)
    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');
    
    // Ensure both buffers have the same length before comparison
    if (hashBuffer.length !== calculatedBuffer.length) {
      console.warn('[TelegramAuth] Hash length mismatch');
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(hashBuffer, calculatedBuffer);
    
    if (!isValid) {
      console.warn('[TelegramAuth] Signature mismatch');
    }
    
    return isValid;
  } catch (error) {
    console.error('[TelegramAuth] Signature verification error:', error.message);
    return false;
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

  // Validate Telegram signature (HMAC-SHA256)
  if (!verifyTelegramSignature(rawInitData, hash)) {
    return { ok: false, error: 'Invalid signature' };
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
