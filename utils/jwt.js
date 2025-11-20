const jwt = require('jsonwebtoken');
const config = require('../config/config');

// JWT payload format: { id, role, iat, exp }
const JWT_PAYLOAD_FIELDS = ['id', 'role'];

function buildAccessToken(user, options = {}) {
  if (!user || !user._id) {
    throw new Error('User is required to build a JWT');
  }

  const payload = {
    id: String(user._id),
    role: user.role || 'user',
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: options.expiresIn || '7d',
  });
}

function buildRefreshToken(user) {
  return buildAccessToken(user, { expiresIn: '30d' });
}

module.exports = {
  buildAccessToken,
  buildRefreshToken,
  JWT_PAYLOAD_FIELDS,
};
