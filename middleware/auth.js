import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = payload?.id || payload?.userId || payload?._id;
    const user = userId ? await User.findById(userId) : null;

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'User is blocked' });
    }

    req.currentUser = user;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }

  return next();
}
