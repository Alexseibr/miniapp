export const MINIAPP_BASE_URL = process.env.MINIAPP_BASE_URL?.trim() || '';

if (!MINIAPP_BASE_URL && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn('MINIAPP_BASE_URL is not set. WebApp buttons will be disabled.');
}
