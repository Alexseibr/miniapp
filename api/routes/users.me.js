const express = require('express');
const authFromTelegram = require('../middleware/authFromTelegram');

const router = express.Router();

router.get('/', authFromTelegram, (req, res) => {
  const user = req.currentUser;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.json({
    telegramId: user.telegramId,
    username: user.username || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    role: user.role || 'user',
    phoneVerified: Boolean(user.phoneVerified),
    verifiedPhone: user.phone || null,
    instagram: user.socialLinks?.instagram || null,
    showUsername: true,
    showPhone: user.privacy?.showPhone ?? false,
    showInstagram: user.privacy?.showSocials ?? true,
    location: user.location || null,
  });
});

module.exports = router;
