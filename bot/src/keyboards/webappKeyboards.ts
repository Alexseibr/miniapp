import { InlineKeyboardMarkup } from 'telegraf/typings/core/types/typegram';
import { MINIAPP_BASE_URL } from '../config/miniapp';

export const startKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: '🛒 Маркетплейс', web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=market_all` } },
      { text: '🌾 Фермерский', web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=niche_farm` } },
    ],
    [
      { text: '🎨 Ремесленники', web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=niche_crafts` } },
      { text: '💐 8 марта', web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=season_march8_tulips` } },
    ],
  ],
};

export const sellKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: 'Создать объявление', web_app: { url: `${MINIAPP_BASE_URL}/create` } }]],
};

export const favoritesKeyboard: InlineKeyboardMarkup = {
  inline_keyboard: [[{ text: 'Избранное', web_app: { url: `${MINIAPP_BASE_URL}?tgWebAppStartParam=market_all#favorites` } }]],
};
