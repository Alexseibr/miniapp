module.exports = function adminAuth(req, res, next) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    console.error('ADMIN_API_TOKEN не задан в окружении');
    return res.status(500).json({ error: 'Admin API not configured' });
  }

  const headerToken = req.headers['x-admin-token'];
  if (!headerToken || headerToken !== adminToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.admin = { id: 'env-admin' };
  next();
};
