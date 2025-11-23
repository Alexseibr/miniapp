import config from '../../config/config.js';

export function logErrors(err, req, _res, next) {
  console.error(`❌ API error on ${req.method} ${req.originalUrl}:`, err);
  next(err);
}

export function notFoundHandler(_req, _res, next) {
  const error = new Error('Маршрут не найден');
  error.status = 404;
  next(error);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Внутренняя ошибка сервера',
  };

  if (config.nodeEnv === 'development' && err.stack) {
    payload.details = err.stack;
  }

  res.status(status).json(payload);
}
