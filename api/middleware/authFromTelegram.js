const User = require('../../models/User');

function parseInitData(rawInitData) {
  if (!rawInitData || typeof rawInitData !== 'string') {
    return null;
  }

  const searchParams = new URLSearchParams(rawInitData);
  const userParam = searchParams.get('user');

  if (!userParam) {
    return null;
  }

  try {
    return JSON.parse(userParam);
  } catch (error) {
    console.error('Failed to parse initData user', error);
    return null;
  }
}

async function authFromTelegram(req, res, next) {
  const rawInitData =
    req.headers['x-telegram-init-data'] || req.query?.initData || null;

  const telegramUser = parseInitData(rawInitData);

  if (!telegramUser || !telegramUser.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const update = {
      telegramId: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
    };

    const userDoc = await User.findOneAndUpdate(
      { telegramId: telegramUser.id },
      {
        $set: update,
        $setOnInsert: {
          favoritesCount: 0,
          ordersCount: 0,
        },
      },
      { upsert: true, new: true }
    );

    req.currentUser = userDoc;
    return next();
  } catch (error) {
    console.error('authFromTelegram error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = authFromTelegram;
