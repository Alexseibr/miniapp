const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { JWT_PAYLOAD_FIELDS } = require('../utils/jwt');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

async function auth(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }

    let payload;

    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (error) {
      const message =
        error.name === 'TokenExpiredError'
          ? 'Token has expired'
          : 'Invalid token';

      console.warn('JWT verification failed', {
        path: req.originalUrl,
        ip: req.ip,
        reason: error.message,
      });

      return res.status(401).json({ error: message });
    }

    if (!payload || typeof payload !== 'object' || !payload.id) {
      console.warn('JWT payload missing required fields', {
        path: req.originalUrl,
        ip: req.ip,
      });
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const user = await User.findById(payload.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'User is blocked' });
    }

    req.currentUser = user;
    req.authPayload = JWT_PAYLOAD_FIELDS.reduce((acc, key) => {
      if (payload[key] != null) {
        acc[key] = payload[key];
      }
      return acc;
    }, {});

    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }

  return next();
}

module.exports = { auth, requireAdmin };
