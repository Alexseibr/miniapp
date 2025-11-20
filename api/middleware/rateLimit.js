const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    console.warn(
      `Rate limit reached for ${req.ip} on ${req.originalUrl}`
    );
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    console.warn(
      `Auth rate limit reached for ${req.ip} on ${req.originalUrl}`
    );
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

module.exports = { apiLimiter, authLimiter };
