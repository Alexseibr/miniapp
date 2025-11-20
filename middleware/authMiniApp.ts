import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import User, { IUserDocument } from '../models/User';

const getDataCheckString = (params: URLSearchParams): string => {
  const entries: string[] = [];
  params.sort();
  params.forEach((value, key) => {
    if (key === 'hash') return;
    entries.push(`${key}=${value}`);
  });
  return entries.join('\n');
};

const isValidInitData = (initData: string, botToken?: string): boolean => {
  if (!botToken) return false;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) return false;

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const dataCheckString = getDataCheckString(params);
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return hmac === receivedHash;
};

declare global {
  namespace Express {
    interface Request {
      currentUser?: IUserDocument;
    }
  }
}

const authMiniApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initData = req.header('X-Telegram-InitData');
    if (!initData) {
      return res.status(401).json({ message: 'Init data is required' });
    }

    const botToken = process.env.BOT_TOKEN;
    const isValid = isValidInitData(initData, botToken);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid init data signature' });
    }

    const params = new URLSearchParams(initData);
    const userDataRaw = params.get('user');
    if (!userDataRaw) {
      return res.status(401).json({ message: 'User data missing' });
    }

    const parsedUser = JSON.parse(userDataRaw);
    const userPayload = {
      telegramId: String(parsedUser.id),
      username: parsedUser.username || '',
      firstName: parsedUser.first_name || '',
      lastName: parsedUser.last_name || '',
      avatarUrl: parsedUser.photo_url || '',
    };

    const user = await User.findOneAndUpdate(
      { telegramId: userPayload.telegramId },
      { $set: userPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    req.currentUser = user;
    return next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('authMiniApp error', error);
    return res.status(401).json({ message: 'Authorization failed' });
  }
};

export default authMiniApp;
