const express = require('express');
const Alert = require('../../models/Alert');

const router = express.Router();

function parseTelegramId(raw) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }
  return id;
}

router.get('/my', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.query.telegramId);
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId query parameter is required' });
    }

    const items = await Alert.find({ userTelegramId: telegramId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (error) {
    console.error('GET /api/alerts/my error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/clear', async (req, res) => {
  try {
    const telegramId = parseTelegramId(req.query.telegramId);
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId query parameter is required' });
    }

    const result = await Alert.deleteMany({ userTelegramId: telegramId });
    res.json({ ok: true, deleted: result.deletedCount || 0 });
  } catch (error) {
    console.error('DELETE /api/alerts/clear error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
