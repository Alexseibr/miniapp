import crypto from 'crypto';

export interface MiniAppUserPayload {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

const buildDataCheckString = (params: URLSearchParams): string => {
  const entries: string[] = [];
  params.sort();
  params.forEach((value, key) => {
    if (key === 'hash') return;
    entries.push(`${key}=${value}`);
  });
  return entries.join('\n');
};

export const parseMiniAppInitData = (initData: string, botToken?: string): MiniAppUserPayload => {
  if (!botToken) {
    throw new Error('Missing bot token');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) {
    throw new Error('Missing init data hash');
  }

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const dataCheckString = buildDataCheckString(params);
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== receivedHash) {
    throw new Error('Invalid init data signature');
  }

  const userData = params.get('user');
  if (!userData) {
    throw new Error('Missing user payload');
  }

  const parsedUser = JSON.parse(userData);

  return {
    telegramId: String(parsedUser.id),
    username: parsedUser.username || '',
    firstName: parsedUser.first_name || '',
    lastName: parsedUser.last_name || '',
    avatarUrl: parsedUser.photo_url || '',
  };
};

export const getInitDataFromRequest = (headerValue?: string): string => {
  if (!headerValue) {
    throw new Error('Init data is required');
  }
  return headerValue;
};

