import { NextFunction, Request, Response } from 'express';
import User, { IUserDocument } from '../models/User';
import { getInitDataFromRequest, parseMiniAppInitData } from '../config/miniapp';

declare global {
  namespace Express {
    interface Request {
      currentUser?: IUserDocument;
    }
  }
}

const authMiniApp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const initData = getInitDataFromRequest(req.header('X-Telegram-InitData'));
    const botToken = process.env.BOT_TOKEN;
    const userPayload = parseMiniAppInitData(initData, botToken);

    const user = await User.findOneAndUpdate(
      { telegramId: userPayload.telegramId },
      { $set: userPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    req.currentUser = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Authorization failed', error: (error as Error).message });
  }
};

export default authMiniApp;
