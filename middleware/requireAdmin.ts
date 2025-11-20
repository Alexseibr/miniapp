import { NextFunction, Request, Response } from 'express';

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }

  return next();
};

export default requireAdmin;
