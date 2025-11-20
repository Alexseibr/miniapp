import { Request, Response } from 'express';

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { telegramId, username, firstName, lastName, avatarUrl } = req.currentUser;

    return res.json({ telegramId, username, firstName, lastName, avatarUrl });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch current user', error });
  }
};
