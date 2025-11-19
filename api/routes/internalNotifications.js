const express = require('express');

const router = express.Router();

router.post('/notify-favorite-update', async (req, res) => {
  try {
    const { telegramId, payload } = req.body || {};

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    const bot = req.app.get('bot');

    if (!bot || typeof bot.sendFavoriteUpdateNotification !== 'function') {
      return res.status(503).json({ error: 'Bot is not ready' });
    }

    await bot.sendFavoriteUpdateNotification(telegramId, payload || {});

    return res.json({ ok: true });
  } catch (error) {
    console.error('notify-favorite-update error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
