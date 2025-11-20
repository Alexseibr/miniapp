const axios = require('axios');
const config = require('../config/config');
const { ATTRIBUTE_SCHEMAS, validateAttributes } = require('../shared/attributeSchemas');

const TULIPS_SESSION_KEY = 'awaitingTulipLocation';
const MARCH8_FLOW_KEY = 'march8_flow';

function buildBaseAd(subcategoryCode) {
  return {
    seasonCode: 'march8_tulips',
    categoryCode: 'flowers',
    categoryId: 'flowers',
    subcategoryCode,
    subcategoryId: subcategoryCode,
    attributes: {},
    photos: [],
  };
}

function askNextAttribute(ctx) {
  const flow = ctx.session[MARCH8_FLOW_KEY];
  if (!flow?.newAd) return;

  const schema = ATTRIBUTE_SCHEMAS[flow.newAd.subcategoryCode] || [];
  const nextField = schema[flow.currentIndex];

  if (!nextField) {
    const hasPriceAttribute = schema.some((f) => String(f.code).startsWith('price'));
    if (!hasPriceAttribute) {
      flow.stage = 'price';
      ctx.reply('Укажи цену товара (число):');
      return;
    }

    flow.stage = 'photos';
    ctx.reply('Пришли фото товара. Минимум одно.');
    return;
  }

  flow.stage = 'attributes';
  ctx.reply(`Поле ${nextField.label}:`);
}

async function handleAttributeAnswer(ctx) {
  const flow = ctx.session[MARCH8_FLOW_KEY];
  const schema = ATTRIBUTE_SCHEMAS[flow.newAd.subcategoryCode] || [];
  const current = schema[flow.currentIndex];
  if (!current) return;

  const text = ctx.message.text;
  let value = text;
  if (current.type === 'number') {
    value = Number(text);
    if (!Number.isFinite(value)) {
      await ctx.reply('Нужно число, попробуй ещё раз');
      return;
    }
  }

  flow.newAd.attributes[current.code] = value;
  flow.currentIndex += 1;
  askNextAttribute(ctx);
}

async function publishAd(ctx, apiUrl) {
  const flow = ctx.session[MARCH8_FLOW_KEY];
  if (!flow?.newAd) return;

  const { valid, errors } = validateAttributes(flow.newAd.subcategoryCode, flow.newAd.attributes);
  if (!valid) {
    await ctx.reply('Исправьте атрибуты: ' + errors.join(', '));
    return;
  }

  const payload = {
    ...flow.newAd,
    title: flow.newAd.title || 'Объявление к 8 марта',
    price: flow.newAd.price || flow.newAd.attributes.price_total || flow.newAd.attributes.price_per_piece || 0,
    currency: 'BYN',
    isLiveSpot: false,
  };

  try {
    await axios.post(`${apiUrl}/api/ads`, payload);
    await ctx.reply('Готово! Объявление отправлено на публикацию.');
  } catch (error) {
    console.error('march8 publish error', error.response?.data || error.message);
    await ctx.reply('Не удалось сохранить объявление, попробуйте позже.');
  }

  ctx.session[MARCH8_FLOW_KEY] = null;
}

function registerSeasonHandlers(bot, { apiUrl } = {}) {
  const API_URL = apiUrl || config.apiBaseUrl;

  bot.command('march8', async (ctx) => {
    ctx.session = ctx.session || {};
    ctx.session[MARCH8_FLOW_KEY] = { stage: 'choose', newAd: null, currentIndex: 0 };
    await ctx.reply(
      '🌷 Запускаем сценарий 8 марта. Выберите формат тюльпанов:',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Тюльпаны поштучно', callback_data: 'march8_tulips_single' },
              { text: 'Букеты тюльпанов', callback_data: 'march8_bouquets' },
            ],
          ],
        },
      }
    );
  });

  bot.on('callback_query', async (ctx, next) => {
    const data = ctx.callbackQuery?.data;
    if (data === 'march8_tulips_single' || data === 'march8_bouquets') {
      const subcategoryCode = data === 'march8_tulips_single' ? 'tulips_single' : 'tulip_bouquets';
      ctx.session[MARCH8_FLOW_KEY] = {
        stage: 'attributes',
        newAd: buildBaseAd(subcategoryCode),
        currentIndex: 0,
      };
      await ctx.answerCbQuery();
      await ctx.reply('Отлично! Соберём информацию.');
      askNextAttribute(ctx);
      return;
    }

    if (data === 'march8_publish') {
      await ctx.answerCbQuery();
      await publishAd(ctx, API_URL);
      return;
    }

    if (data === 'march8_cancel') {
      ctx.session[MARCH8_FLOW_KEY] = null;
      await ctx.answerCbQuery('Отменено');
      return;
    }

    return next();
  });

  bot.hears('Отменить', (ctx, next) => {
    if (ctx.session?.[MARCH8_FLOW_KEY]) {
      ctx.session[MARCH8_FLOW_KEY] = null;
      ctx.reply('Сценарий сброшен');
      return;
    }
    return next();
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session?.[MARCH8_FLOW_KEY]) {
      const flow = ctx.session[MARCH8_FLOW_KEY];
      if (flow.stage === 'attributes') {
        return handleAttributeAnswer(ctx);
      }
      if (flow.stage === 'price') {
        const price = Number(ctx.message.text);
        if (!Number.isFinite(price)) {
          return ctx.reply('Укажи цену числом');
        }
        flow.newAd.price = price;
        flow.stage = 'photos';
        return ctx.reply('Пришли фото товара. Минимум одно.');
      }
    }
    return next();
  });

  bot.on('photo', async (ctx, next) => {
    if (!ctx.session?.[MARCH8_FLOW_KEY]) return next();
    const flow = ctx.session[MARCH8_FLOW_KEY];
    const photoSizes = ctx.message.photo || [];
    const best = photoSizes[photoSizes.length - 1];
    if (best?.file_id) {
      flow.newAd.photos.push(best.file_id);
    }

    if (flow.newAd.photos.length === 1) {
      await ctx.reply('Фото получено. Опубликовать?', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Опубликовать', callback_data: 'march8_publish' }]],
        },
      });
    }
  });

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

module.exports = registerSeasonHandlers;
