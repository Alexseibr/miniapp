require('dotenv').config();
import mongoose from 'mongoose';

import Category from '../models/Category.js';
import Season from '../models/Season.js';

async function main() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGO_URL или MONGODB_URI не указан в переменных окружения');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);

    console.log('📦 MongoDB connected (seeding)');

    const categories = [
      // Авто
      { slug: 'auto', name: 'Авто', parentSlug: null, sortOrder: 10 },
      { slug: 'cars', name: 'Легковые', parentSlug: 'auto', sortOrder: 11 },
      { slug: 'moto', name: 'Мотоциклы', parentSlug: 'auto', sortOrder: 12 },
      { slug: 'trucks', name: 'Грузовики', parentSlug: 'auto', sortOrder: 13 },

      // Недвижимость
      { slug: 'realty', name: 'Недвижимость', parentSlug: null, sortOrder: 20 },
      { slug: 'rent_flat', name: 'Аренда квартир', parentSlug: 'realty', sortOrder: 21 },
      { slug: 'rent_house', name: 'Аренда домов', parentSlug: 'realty', sortOrder: 22 },
      { slug: 'country_base', name: 'Базы отдыха', parentSlug: 'realty', sortOrder: 23 },

      // Фермеры
      { slug: 'farm', name: 'Фермерские товары', parentSlug: null, sortOrder: 30 },
      { slug: 'berries', name: 'Ягоды', parentSlug: 'farm', sortOrder: 31 },
      { slug: 'vegetables', name: 'Овощи', parentSlug: 'farm', sortOrder: 32 },
      { slug: 'fruits', name: 'Фрукты', parentSlug: 'farm', sortOrder: 33 },
      { slug: 'eggs', name: 'Яйца', parentSlug: 'farm', sortOrder: 34 },
      { slug: 'milk', name: 'Молоко', parentSlug: 'farm', sortOrder: 35 },
      { slug: 'meat', name: 'Мясо', parentSlug: 'farm', sortOrder: 36 },

      // Ремесленничество
      { slug: 'craft', name: 'Ремесленники', parentSlug: null, sortOrder: 40 },
      { slug: 'cakes', name: 'Торты', parentSlug: 'craft', sortOrder: 41 },
      { slug: 'eclairs', name: 'Эклеры', parentSlug: 'craft', sortOrder: 42 },
      { slug: 'cupcakes', name: 'Капкейки', parentSlug: 'craft', sortOrder: 43 },
      { slug: 'sweets_sets', name: 'Наборы сладостей', parentSlug: 'craft', sortOrder: 44 },

      // Услуги
      { slug: 'services', name: 'Услуги', parentSlug: null, sortOrder: 50 },
      { slug: 'build', name: 'Строительство', parentSlug: 'services', sortOrder: 51 },
      { slug: 'delivery_services', name: 'Доставка', parentSlug: 'services', sortOrder: 52 },
    ];

    // Создаем активный сезон (текущий месяц ± 15 дней для тестирования)
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 5); // 5 дней назад
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + 15); // 15 дней вперед

    const season = {
      code: 'winter_fair_2025',
      name: 'Зимняя ярмарка 2025',
      description: 'Праздничная ярмарка! Новогодние подарки, сладости ручной работы, фермерские продукты и многое другое.',
      startDate: startDate,
      endDate: endDate,
      isActive: true,
    };

    await Category.deleteMany({});
    await Season.deleteMany({});

    await Category.insertMany(categories);
    await Season.create(season);

    console.log('✅ Категории добавлены (23 шт.)');
    console.log(`✅ Сезон добавлен: "${season.name}" (${season.code})`);
    console.log(`   📅 Активен с ${startDate.toLocaleDateString('ru-RU')} по ${endDate.toLocaleDateString('ru-RU')}`);
  } catch (err) {
    console.error('❌ Ошибка при заполнении:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

main();
