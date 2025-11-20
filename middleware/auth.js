const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { telegramInitDataMiddleware, extractInitDataFromRequest } = require('./telegramAuth');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);

      if (!user) {
        return res.status(401).json({ message: 'Пользователь не найден' });
      }

      req.currentUser = user;
      req.authMethod = 'jwt';
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Неверный или истёкший токен' });
    }
  }

  const initData = extractInitDataFromRequest(req);
  if (!initData) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  return telegramInitDataMiddleware(req, res, next);
}

module.exports = authMiddleware;
