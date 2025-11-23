import axios from 'axios';
import * as config from '../config/config.js';

const TULIPS_SESSION_KEY = 'awaitingTulipLocation';

function registerSeasonHandlers(bot, { apiUrl } = {}) {
  const API_URL = apiUrl || config.apiBaseUrl;

  bot.command('tulips_nearby', async (ctx) => {
    ctx.session = ctx.session || {};
    ctx.session[TULIPS_SESSION_KEY] = true;

    await ctx.reply(
      '📍 Отправь свою геопозицию, чтобы показать ближайших продавцов тюльпанов.',
      {
        reply_markup: {
          keyboard: [[{ text: 'Отправить геопозицию', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  bot.on('location', async (ctx, next) => {
    if (!ctx.session?.[TULIPS_SESSION_KEY]) {
      return next();
    }

    ctx.session[TULIPS_SESSION_KEY] = false;

    const { latitude, longitude } = ctx.message.location || {};
    if (latitude == null || longitude == null) {
      await ctx.reply('Не удалось получить координаты. Попробуй ещё раз командой /tulips_nearby.');
      return;
    }

    try {
      await ctx.reply('⏳ Ищу продавцов тюльпанов поблизости...');
      const response = await axios.get(`${API_URL}/api/ads/nearby`, {
        params: {
          lat: latitude,
          lng: longitude,
          radiusKm: 5,
          seasonCode: 'march8_tulips',
          subcategoryId: 'flowers_tulips',
        },
      });

      const items = response.data?.items || [];

      if (!items.length) {
        await ctx.reply('Рядом пока нет активных предложений тюльпанов. Попробуй позже.');
        return;
      }

      const lines = items.slice(0, 5).map((ad, index) => {
        const price = typeof ad.price === 'number' ? `${ad.price} ${ad.currency || 'BYN'}` : '—';
        const distance = ad.distanceKm != null ? `${ad.distanceKm} км` : '—';
        return (
          `${index + 1}. ${ad.title}\n` +
          `   Цена: ${price}\n` +
          `   Расстояние: ${distance}`
        );
      });

      await ctx.reply('🌷 Ближайшие продавцы тюльпанов:\n\n' + lines.join('\n\n'), {
        reply_markup: { remove_keyboard: true },
      });
    } catch (error) {
      console.error('/tulips_nearby error:', error.response?.data || error.message);
      await ctx.reply('⚠️ Не удалось получить список. Попробуй чуть позже.');
    }
  });
}

export default registerSeasonHandlers;
