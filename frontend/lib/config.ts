export const SITE_URL = process.env.SITE_URL?.replace(/\/$/, '') || 'https://example.com';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

export const DEFAULT_OG_IMAGE = `${SITE_URL}/static/og-default.jpg`;
export const DEFAULT_SEO = {
  title: 'Куфор-Код — маркетплейс объявлений',
  description:
    'Куфор-Код — маркетплейс товаров и услуг от фермеров и местных продавцов. Покупайте рядом с вами.',
};
