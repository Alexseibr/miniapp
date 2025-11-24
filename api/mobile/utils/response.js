export function success(data, meta = undefined) {
  const payload = { success: true, data };
  if (meta) {
    payload.meta = meta;
  }
  return payload;
}

export function failure(code, message, details = undefined) {
  const error = { code, message };
  if (details) {
    error.details = details;
  }
  return { success: false, error };
}

export function sendSuccess(res, data, meta) {
  return res.json(success(data, meta));
}

export function sendError(res, status, code, message, details) {
  return res.status(status).json(failure(code, message, details));
}

export function handleRouteError(res, error, fallbackCode = 'INTERNAL_ERROR') {
  const status = error.status || error.statusCode || 500;
  const code = error.code || fallbackCode;
  const message = error.message || 'Internal server error';
  const details = error.details;
  return res.status(status).json(failure(code, message, details));
}
