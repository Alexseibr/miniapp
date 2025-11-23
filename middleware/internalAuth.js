const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET;

function extractProvidedSecret(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const [scheme, token] = authHeader.split(' ');
    if (scheme && scheme.toLowerCase() === 'bearer') {
      return token;
    }
  }

  const headerSecret = req.headers['x-internal-secret'];
  if (headerSecret && typeof headerSecret === 'string') {
    return headerSecret;
  }

  return undefined;
}

export default function requireInternalAuth(req, res, next) {
  if (!INTERNAL_SECRET) {
    console.error('Internal API secret is not configured');
    return res.status(503).json({ error: 'Internal access is not configured' });
  }

  const providedSecret = extractProvidedSecret(req);

  if (providedSecret !== INTERNAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
};
