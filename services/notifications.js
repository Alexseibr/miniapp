const User = require('../models/User');
const { sendMessageToTelegramId } = require('../bot/messenger');

function formatChangedFields(ad, changedFields) {
  const parts = [];

  if (changedFields.price) {
    const { old, new: next } = changedFields.price;
    parts.push(`• Цена: ${old} → ${next} ${ad.currency || 'BYN'}`);
  }

  if (changedFields.status) {
    const { old, new: next } = changedFields.status;
    parts.push(`• Статус: ${old} → ${next}`);
  }

  return parts.join('\n');
}

async function notifyUsersAboutAdChange(ad, changedFields = {}) {
  if (!ad?._id) {
    return;
  }

  const fieldNames = Object.keys(changedFields || {});
  if (!fieldNames.length) {
    return;
  }

  const messageBody = formatChangedFields(ad, changedFields);
  if (!messageBody) {
    return;
  }

  const watchers = await User.find({ favorites: ad._id })
    .select('telegramId')
    .lean();

  if (!watchers.length) {
    return;
  }

  const header = `🔔 Объявление обновлено\n«${ad.title}»`;
  const footer = '\n\nЧтобы посмотреть детали, открой приложение KETMAR Market или команду /market.';
  const text = `${header}\n\n${messageBody}${footer}`;

  await Promise.all(
    watchers.map(async (user) => {
      if (!user.telegramId) return;
      try {
        await sendMessageToTelegramId(user.telegramId, text);
      } catch (error) {
        console.error('Не удалось отправить уведомление пользователю', {
          telegramId: user.telegramId,
          adId: ad._id,
          error,
        });
      }
    })
  );
}

module.exports = {
  notifyUsersAboutAdChange,
};
