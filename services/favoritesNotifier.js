const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const config = require('../config/config');
const { sendMessageToTelegramId } = require('../bot/messenger');

const LOG_FILE_PATH = path.join(__dirname, '..', 'logs', 'favorites.log');

function ensureLogFile() {
  const dir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE_PATH)) {
    fs.writeFileSync(LOG_FILE_PATH, '');
  }
}

async function appendLog(entry) {
  try {
    ensureLogFile();
    await fs.promises.appendFile(LOG_FILE_PATH, `${JSON.stringify(entry)}\n`);
  } catch (error) {
    console.error('favoritesNotifier appendLog error:', error);
  }
}

function buildAdLink(ad) {
  if (config.miniAppUrl) {
    try {
      const url = new URL(config.miniAppUrl);
      url.searchParams.set('adId', ad._id.toString());
      return url.toString();
    } catch (error) {
      // ignore malformed base URL
    }
  }

  if (config.apiBaseUrl) {
    const base = config.apiBaseUrl.replace(/\/$/, '');
    return `${base}/api/ads/${ad._id}`;
  }

  return null;
}

function formatUpdateMessage(ad, updates) {
  const lines = ['\ud83d\udd14 Обновление по избранному объявлению:', `Название: ${ad.title || 'Без названия'}`];

  if (updates.price) {
    lines.push(`Старая цена: ${updates.price.old ?? '—'}`);
    lines.push(`Новая цена: ${updates.price.new ?? '—'}`);
  }

  if (updates.status) {
    lines.push(`Старый статус: ${updates.status.old ?? '—'}`);
    lines.push(`Новый статус: ${updates.status.new ?? '—'}`);
  }

  const link = buildAdLink(ad);
  if (link) {
    lines.push(`Посмотреть: ${link}`);
  }

  return lines.join('\n');
}

async function notifyUserAboutFavorite(user, ad, updates) {
  if (!updates.price && !updates.status) {
    return;
  }

  const message = formatUpdateMessage(ad, updates);

  try {
    await sendMessageToTelegramId(user.telegramId, message, { disable_web_page_preview: true });
  } catch (error) {
    console.error('favoritesNotifier sendMessage error:', error);
  }
}

async function checkFavoritesForChanges() {
  try {
    const users = await User.find({ 'favorites.0': { $exists: true } }).populate('favorites.adId');

    for (const user of users) {
      let hasUpdates = false;

      for (const favorite of user.favorites) {
        const ad = favorite.adId;
        if (!ad || !ad._id) {
          continue;
        }

        const updates = {};
        const priceChanged =
          typeof ad.price === 'number' &&
          favorite.lastKnownPrice != null &&
          ad.price !== favorite.lastKnownPrice;
        const statusChanged =
          typeof ad.status === 'string' &&
          favorite.lastKnownStatus &&
          ad.status !== favorite.lastKnownStatus;

        if (priceChanged) {
          updates.price = { old: favorite.lastKnownPrice, new: ad.price };
          favorite.lastKnownPrice = ad.price;
          hasUpdates = true;
        } else if (favorite.lastKnownPrice == null && ad.price != null) {
          favorite.lastKnownPrice = ad.price;
          hasUpdates = true;
        }

        if (statusChanged) {
          updates.status = { old: favorite.lastKnownStatus, new: ad.status };
          favorite.lastKnownStatus = ad.status;
          hasUpdates = true;
        } else if (!favorite.lastKnownStatus && ad.status) {
          favorite.lastKnownStatus = ad.status;
          hasUpdates = true;
        }

        if (updates.price || updates.status) {
          const logEntry = {
            timestamp: new Date().toISOString(),
            userTelegramId: user.telegramId,
            adId: ad._id.toString(),
            title: ad.title,
            updates,
          };
          await appendLog(logEntry);
          await notifyUserAboutFavorite(user, ad, updates);
        }
      }

      if (hasUpdates) {
        await user.save();
      }
    }
  } catch (error) {
    console.error('checkFavoritesForChanges error:', error);
  }
}

module.exports = {
  checkFavoritesForChanges,
};
