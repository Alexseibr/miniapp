require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category.js');
const Season = require('../models/Season.js');

// Поддержка обоих вариантов переменных окружения
const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI;

if (!MONGO_URL) {
  console.error('❌ MONGO_URL или MONGODB_URI не найден в переменных окружения!');
  process.exit(1);
}

const categories = [
  // Авто
  { slug: 'auto', name: 'Авто', parentSlug: null, sortOrder: 1 },
  { slug: 'cars', name: 'Легковые', parentSlug: 'auto', sortOrder: 1 },
  { slug: 'moto', name: 'Мотоциклы', parentSlug: 'auto', sortOrder: 2 },
  { slug: 'trucks', name: 'Грузовики', parentSlug: 'auto', sortOrder: 3 },

  // Недвижимость
  { slug: 'realty', name: 'Недвижимость', parentSlug: null, sortOrder: 2 },
  { slug: 'rent_flat', name: 'Аренда квартир', parentSlug: 'realty', sortOrder: 1 },
  { slug: 'rent_house', name: 'Аренда домов', parentSlug: 'realty', sortOrder: 2 },
  { slug: 'country_base', name: 'Базы отдыха', parentSlug: 'realty', sortOrder: 3 },

  // Фермерские товары
  { slug: 'farm', name: 'Фермерские товары', parentSlug: null, sortOrder: 3 },
  { slug: 'berries', name: 'Ягоды', parentSlug: 'farm', sortOrder: 1 },
  { slug: 'vegetables', name: 'Овощи', parentSlug: 'farm', sortOrder: 2 },
  { slug: 'fruits', name: 'Фрукты', parentSlug: 'farm', sortOrder: 3 },
  { slug: 'eggs', name: 'Яйца', parentSlug: 'farm', sortOrder: 4 },
  { slug: 'milk', name: 'Молоко', parentSlug: 'farm', sortOrder: 5 },
  { slug: 'meat', name: 'Мясо', parentSlug: 'farm', sortOrder: 6 },

  // Ремесленники
  { slug: 'craft', name: 'Ремесленники', parentSlug: null, sortOrder: 4 },
  { slug: 'cakes', name: 'Торты', parentSlug: 'craft', sortOrder: 1 },
  { slug: 'eclairs', name: 'Эклеры', parentSlug: 'craft', sortOrder: 2 },
  { slug: 'cupcakes', name: 'Капкейки', parentSlug: 'craft', sortOrder: 3 },
  { slug: 'sweets_sets', name: 'Наборы сладостей', parentSlug: 'craft', sortOrder: 4 },

  // Услуги
  { slug: 'services', name: 'Услуги', parentSlug: null, sortOrder: 5 },
  { slug: 'build', name: 'Строительство', parentSlug: 'services', sortOrder: 1 },
  { slug: 'delivery_services', name: 'Доставка', parentSlug: 'services', sortOrder: 2 },
];

const seasonData = {
  code: 'march8_tulips',
  name: 'Ярмарка 8 Марта — тюльпаны и подарки',
  description:
    'Праздничная ярмарка к Международному женскому дню! Тюльпаны, подарки ручной работы, сладости и многое другое для ваших любимых женщин.',
  startDate: new Date('2025-03-01'),
  endDate: new Date('2025-03-10'),
  isActive: true,
};

async function seed() {
  try {
    console.log('🌱 Начинаем заполнение базы данных...\n');

    // Подключение к MongoDB
    console.log('📊 Подключение к MongoDB...');
    await mongoose.connect(MONGO_URL);
    console.log('✅ MongoDB подключена успешно!\n');

    // Очистка категорий
    console.log('🗑️  Очистка существующих категорий...');
    const deletedCategories = await Category.deleteMany({});
    console.log(`✅ Удалено категорий: ${deletedCategories.deletedCount}\n`);

    // Вставка категорий
    console.log('📂 Создание категорий...');
    const insertedCategories = await Category.insertMany(categories);
    console.log(`✅ Создано категорий: ${insertedCategories.length}`);

    // Подсчёт родительских и дочерних категорий
    const parentCategories = categories.filter((c) => !c.parentSlug);
    const childCategories = categories.filter((c) => c.parentSlug);
    console.log(`   📁 Родительских: ${parentCategories.length}`);
    console.log(`   📄 Подкатегорий: ${childCategories.length}\n`);

    // Обработка сезона
    console.log('🌸 Создание сезона "8 Марта"...');
    await Season.deleteMany({ code: seasonData.code });
    const season = await Season.create(seasonData);
    console.log(`✅ Сезон создан: ${season.name}`);
    console.log(`   📅 Даты: ${season.startDate.toLocaleDateString('ru-RU')} - ${season.endDate.toLocaleDateString('ru-RU')}`);
    console.log(`   🟢 Активен: ${season.isActive ? 'Да' : 'Нет'}\n`);

    // Итоговая статистика
    console.log('✨ База данных успешно заполнена!\n');
    console.log('📊 Итого:');
    console.log(`   Категорий: ${insertedCategories.length}`);
    console.log(`   Сезонов: 1\n`);

    console.log('🎯 Список главных категорий:');
    parentCategories.forEach((cat) => {
      console.log(`   • ${cat.name} (${cat.slug})`);
      const subs = childCategories.filter((c) => c.parentSlug === cat.slug);
      subs.forEach((sub) => {
        console.log(`     - ${sub.name} (${sub.slug})`);
      });
    });

    console.log('\n👋 Готово! База данных готова к работе.');
  } catch (error) {
    console.error('\n❌ Ошибка при заполнении базы данных:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n⚠️  MongoDB disconnected');
    process.exit(0);
  }
}

seed();
