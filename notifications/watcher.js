import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Ad from '../models/Ad.js';
import Alert from '../models/Alert.js';
import * as config from '../config/config.js';
import { sendMessageToTelegramId } from '../bot/messenger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
    console.error('favorites watcher appendLog error:', error);
  }
}

function buildAdLink(adId) {
  if (!adId) {
    return null;
  }

  if (config.miniAppUrl) {
    try {
      const url = new URL(config.miniAppUrl);
      url.searchParams.set('adId', adId.toString());
      return url.toString();
    } catch (error) {
      // ignore malformed base url
    }
  }

  if (config.apiBaseUrl) {
    const base = config.apiBaseUrl.replace(/\/$/, '');
    return `${base}/api/ads/${adId}`;
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

  const link = buildAdLink(ad._id);
  if (link) {
    lines.push(`Посмотреть: ${link}`);
  }

  return lines.join('\n');
}

function formatRemovalMessage(favorite) {
  const title = favorite?.adId?.title || 'Объявление';
  const lines = [
    '\u26a0\ufe0f Объявление из избранного недоступно.',
    `Название: ${title}`,
  ];

  if (favorite?.lastKnownStatus) {
    lines.push(`Последний статус: ${favorite.lastKnownStatus}`);
  }

  lines.push('Оно могло быть удалено или скрыто продавцом.');
  return lines.join('\n');
}

async function notifyUser(user, message) {
  if (!message) {
    return;
  }

  try {
    await sendMessageToTelegramId(user.telegramId, message, { disable_web_page_preview: true });
  } catch (error) {
    console.error('favorites watcher Telegram error:', error);
  }
}

async function processFavorite(user, favorite) {
  const ad = favorite.adId;
  if (!ad || !ad._id) {
    const adIdForAlert = favorite?.adId?._id || favorite?.adId;
    await appendLog({
      type: 'ad_removed',
      timestamp: new Date().toISOString(),
      userTelegramId: user.telegramId,
      adId: adIdForAlert,
    });

    if (adIdForAlert) {
      const lastStatus = favorite?.lastKnownStatus || 'unknown';
      await Alert.create({
        userTelegramId: user.telegramId,
        adId: adIdForAlert,
        adTitleSnapshot: favorite?.adId?.title || favorite?.title,
        oldStatus: lastStatus,
        newStatus: 'removed',
        type: 'status_change',
      });
    }
    await notifyUser(user, formatRemovalMessage(favorite));
    return { remove: true, updated: true };
  }

  const updates = {};
  let hasChanges = false;

  if (
    typeof ad.price === 'number' &&
    favorite.lastKnownPrice != null &&
    ad.price !== favorite.lastKnownPrice
  ) {
    updates.price = { old: favorite.lastKnownPrice, new: ad.price };
    favorite.lastKnownPrice = ad.price;
    hasChanges = true;
  } else if (favorite.lastKnownPrice == null && typeof ad.price === 'number') {
    favorite.lastKnownPrice = ad.price;
    hasChanges = true;
  }

  if (ad.status) {
    if (favorite.lastKnownStatus && favorite.lastKnownStatus !== ad.status) {
      updates.status = { old: favorite.lastKnownStatus, new: ad.status };
      favorite.lastKnownStatus = ad.status;
      hasChanges = true;
    } else if (!favorite.lastKnownStatus) {
      favorite.lastKnownStatus = ad.status;
      hasChanges = true;
    }
  }

  if (updates.price || updates.status) {
    const logEntry = {
      type: 'ad_update',
      timestamp: new Date().toISOString(),
      userTelegramId: user.telegramId,
      adId: ad._id.toString(),
      updates,
    };
    await appendLog(logEntry);

    const alertBase = {
      userTelegramId: user.telegramId,
      adId: ad._id,
      adTitleSnapshot: ad.title,
    };

    if (updates.price) {
      await Alert.create({
        ...alertBase,
        oldPrice: updates.price.old,
        newPrice: updates.price.new,
        type: 'price_drop',
      });
    }

    if (updates.status) {
      await Alert.create({
        ...alertBase,
        oldStatus: updates.status.old,
        newStatus: updates.status.new,
        type: 'status_change',
      });
    }
    await notifyUser(user, formatUpdateMessage(ad, updates));
  }

  return { remove: false, updated: hasChanges };
}

async function checkFavoritesForChanges() {
  try {
    const users = await User.find({ 'favorites.0': { $exists: true } }).populate('favorites.adId');

    for (const user of users) {
      let userUpdated = false;

      for (let index = user.favorites.length - 1; index >= 0; index -= 1) {
        const favorite = user.favorites[index];
        try {
          const result = await processFavorite(user, favorite);
          if (result.remove) {
            user.favorites.splice(index, 1);
          }
          if (result.updated) {
            userUpdated = true;
          }
        } catch (error) {
          console.error('favorites watcher favorite error:', error);
        }
      }

      if (userUpdated) {
        await user.save();
      }
    }
  } catch (error) {
    console.error('checkFavoritesForChanges error:', error);
  }
}

export { checkFavoritesForChanges };
