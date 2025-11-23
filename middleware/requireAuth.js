export default function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
};
