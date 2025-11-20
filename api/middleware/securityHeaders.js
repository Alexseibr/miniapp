const helmet = require('helmet');

function securityHeaders(app) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "img-src": ["'self'", 'data:', 'https:', process.env.CDN_BASE_URL || ''],
          "script-src": ["'self'", "'unsafe-inline'"],
          "connect-src": ["'self'", process.env.FRONTEND_URL || ''],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );
}

module.exports = { securityHeaders };
