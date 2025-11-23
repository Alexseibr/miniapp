// telegram/commands/notifications.js
import UserSettings from '../../models/UserSettings.js';

async function getOrCreateSettings(userTelegramId) {
  let settings = await UserSettings.findOne({ userTelegramId });
  if (!settings) {
    settings = await UserSettings.create({ userTelegramId });
  }
  return settings;
}

export default (bot) => {
  bot.command('notifications', async (ctx) => {
    const userTelegramId = String(ctx.from.id);
    const settings = await getOrCreateSettings(userTelegramId);

    const text =
      '⚙️ Настройки уведомлений:\n\n' +
      `Снижение цены: ${settings.notifyOnPriceChange ? '✅ Вкл' : '❌ Выкл'}\n` +
      `Смена статуса: ${settings.notifyOnStatusChange ? '✅ Вкл' : '❌ Выкл'}`;

    await ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: settings.notifyOnPriceChange ? '🔕 Цена' : '🔔 Цена',
              callback_data: 'notif_toggle_price',
            },
            {
              text: settings.notifyOnStatusChange ? '🔕 Статус' : '🔔 Статус',
              callback_data: 'notif_toggle_status',
            },
          ],
        ],
      },
    });
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userTelegramId = String(ctx.from.id);

    if (!data.startsWith('notif_')) return;

    const settings = await getOrCreateSettings(userTelegramId);

    if (data === 'notif_toggle_price') {
      settings.notifyOnPriceChange = !settings.notifyOnPriceChange;
    }
    if (data === 'notif_toggle_status') {
      settings.notifyOnStatusChange = !settings.notifyOnStatusChange;
    }

    await settings.save();
    await ctx.answerCbQuery('Обновлено');

    const text =
      '⚙️ Настройки уведомлений:\n\n' +
      `Снижение цены: ${settings.notifyOnPriceChange ? '✅ Вкл' : '❌ Выкл'}\n` +
      `Смена статуса: ${settings.notifyOnStatusChange ? '✅ Вкл' : '❌ Выкл'}`;

    await ctx.editMessageText(text, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: settings.notifyOnPriceChange ? '🔕 Цена' : '🔔 Цена',
              callback_data: 'notif_toggle_price',
            },
            {
              text: settings.notifyOnStatusChange ? '🔕 Статус' : '🔔 Статус',
              callback_data: 'notif_toggle_status',
            },
          ],
        ],
      },
    });
  });
};
