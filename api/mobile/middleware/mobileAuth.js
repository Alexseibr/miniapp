import jwt from 'jsonwebtoken';
import User from '../../../models/User.js';
import { sendError } from '../utils/response.js';

export async function mobileAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authorization header missing');
    }

    const token = authHeader.slice(7);
    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Token is invalid or expired');
    }

    const userId = payload?.id || payload?.userId;
    if (!userId) {
      return sendError(res, 401, 'INVALID_TOKEN', 'User id missing in token');
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 401, 'USER_NOT_FOUND', 'User not found');
    }

    if (user.isBlocked) {
      return sendError(res, 403, 'USER_BLOCKED', 'User is blocked');
    }

    req.currentUser = user;
    return next();
  } catch (error) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Unauthorized', error.message);
  }
}
