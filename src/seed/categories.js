export const categoriesSeed = [
  // Авто
  { slug: 'auto', name: 'Авто', parentSlug: null, sortOrder: 1 },
  { slug: 'cars', name: 'Легковые', parentSlug: 'auto', sortOrder: 2 },
  { slug: 'moto', name: 'Мото', parentSlug: 'auto', sortOrder: 3 },
  { slug: 'trucks', name: 'Грузовики', parentSlug: 'auto', sortOrder: 4 },

  // Недвижимость
  { slug: 'realty', name: 'Недвижимость', parentSlug: null, sortOrder: 10 },
  { slug: 'rent_flat', name: 'Аренда квартир', parentSlug: 'realty', sortOrder: 11 },
  { slug: 'rent_house', name: 'Аренда домов', parentSlug: 'realty', sortOrder: 12 },
  { slug: 'country_base', name: 'Загородные базы', parentSlug: 'realty', sortOrder: 13 },

  // Фермерские товары
  { slug: 'farm', name: 'Фермерские товары', parentSlug: null, sortOrder: 20 },
  { slug: 'berries', name: 'Ягоды', parentSlug: 'farm', sortOrder: 21 },
  { slug: 'vegetables', name: 'Овощи', parentSlug: 'farm', sortOrder: 22 },
  { slug: 'fruits', name: 'Фрукты', parentSlug: 'farm', sortOrder: 23 },
  { slug: 'eggs', name: 'Яйца', parentSlug: 'farm', sortOrder: 24 },
  { slug: 'milk', name: 'Молочная продукция', parentSlug: 'farm', sortOrder: 25 },
  { slug: 'meat', name: 'Мясо', parentSlug: 'farm', sortOrder: 26 },

  // Ремесленники
  { slug: 'craft', name: 'Ремесленники', parentSlug: null, sortOrder: 30 },
  { slug: 'cakes', name: 'Торты', parentSlug: 'craft', sortOrder: 31 },
  { slug: 'eclairs', name: 'Эклеры', parentSlug: 'craft', sortOrder: 32 },
  { slug: 'cupcakes', name: 'Капкейки', parentSlug: 'craft', sortOrder: 33 },
  { slug: 'sweets_sets', name: 'Наборы сладостей', parentSlug: 'craft', sortOrder: 34 },

  // Услуги
  { slug: 'services', name: 'Услуги', parentSlug: null, sortOrder: 40 },
  { slug: 'build', name: 'Строительство и ремонт', parentSlug: 'services', sortOrder: 41 },
  { slug: 'delivery_services', name: 'Доставка и курьеры', parentSlug: 'services', sortOrder: 42 },
];
