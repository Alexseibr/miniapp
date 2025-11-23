// telegram/commands/favorites.js
import Favorite from '../../models/Favorite.js';

export default (bot) => {
  bot.command('favorites', async (ctx) => {
    const userTelegramId = String(ctx.from.id);

    const favorites = await Favorite.find({ userTelegramId })
      .populate('adId')
      .lean();

    if (!favorites.length) {
      return ctx.reply('У вас пока нет избранных объявлений.');
    }

    for (const fav of favorites) {
      const ad = fav.adId;
      if (!ad) continue;

      const text =
        `⭐ <b>${ad.title}</b>\n` +
        `Цена: ${ad.price}\n` +
        `Статус: ${ad.status}\n` +
        `Уведомления: ` +
        `${fav.notifyOnPriceChange ? '💰 цена' : ''}` +
        `${fav.notifyOnStatusChange ? ' 📦 статус' : ''}`;

      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: fav.notifyOnPriceChange ? '🔕 Цена' : '🔔 Цена',
                callback_data: `fav_toggle_price:${ad._id}`,
              },
              {
                text: fav.notifyOnStatusChange ? '🔕 Статус' : '🔔 Статус',
                callback_data: `fav_toggle_status:${ad._id}`,
              },
            ],
            [
              {
                text: '🗑 Удалить из избранного',
                callback_data: `fav_delete:${ad._id}`,
              },
            ],
          ],
        },
      });
    }
  });

  bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userTelegramId = String(ctx.from.id);

    if (data.startsWith('fav_toggle_price:')) {
      const adId = data.split(':')[1];
      const fav = await Favorite.findOne({ userTelegramId, adId });
      if (!fav) return ctx.answerCbQuery('Не найдено.');

      fav.notifyOnPriceChange = !fav.notifyOnPriceChange;
      await fav.save();
      return ctx.answerCbQuery(
        fav.notifyOnPriceChange
          ? 'Уведомления по цене включены'
          : 'Уведомления по цене выключены',
        { show_alert: false }
      );
    }

    if (data.startsWith('fav_toggle_status:')) {
      const adId = data.split(':')[1];
      const fav = await Favorite.findOne({ userTelegramId, adId });
      if (!fav) return ctx.answerCbQuery('Не найдено.');

      fav.notifyOnStatusChange = !fav.notifyOnStatusChange;
      await fav.save();
      return ctx.answerCbQuery(
        fav.notifyOnStatusChange
          ? 'Уведомления по статусу включены'
          : 'Уведомления по статусу выключены',
        { show_alert: false }
      );
    }

    if (data.startsWith('fav_delete:')) {
      const adId = data.split(':')[1];
      await Favorite.findOneAndDelete({ userTelegramId, adId });
      return ctx.answerCbQuery('Удалено из избранного');
    }
  });
};
