import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CityLayout from '../models/CityLayout.js';

dotenv.config();

const layouts = [
  {
    cityCode: 'brest',
    screen: 'home',
    variant: 'default',
    seasonCode: null,
    isActive: true,
    blocks: [
      {
        id: 'brest_home_search',
        type: 'search_bar',
        order: 0,
        config: {
          placeholder: 'Поиск по объявлениям в Бресте',
          showFilters: true,
        },
      },
      {
        id: 'brest_home_hero',
        type: 'hero_banner',
        order: 1,
        config: {
          slotId: 'brest_hero_main',
        },
      },
      {
        id: 'brest_home_categories',
        type: 'category_grid',
        order: 2,
        config: {
          title: 'Популярные категории',
          maxCategories: 12,
          layout: 'grid',
          columns: 3,
        },
      },
      {
        id: 'brest_home_trending',
        type: 'ad_carousel',
        order: 3,
        config: {
          title: 'Популярное в Бресте',
          dataSource: 'trending',
          limit: 10,
          cityCode: 'brest',
        },
      },
      {
        id: 'brest_home_rental_promo',
        type: 'promo_island',
        order: 4,
        config: {
          title: 'Краткосрочная аренда',
          subtitle: 'Квартиры и дома посуточно',
          seasonCode: 'short_term_rental',
          actionText: 'Смотреть всё',
          actionUrl: '/season/short_term_rental',
        },
      },
    ],
  },
  {
    cityCode: 'minsk',
    screen: 'home',
    variant: 'default',
    seasonCode: null,
    isActive: true,
    blocks: [
      {
        id: 'minsk_home_search',
        type: 'search_bar',
        order: 0,
        config: {
          placeholder: 'Поиск в Минске',
          showFilters: true,
        },
      },
      {
        id: 'minsk_home_hero',
        type: 'hero_banner',
        order: 1,
        config: {
          slotId: 'minsk_hero_main',
        },
      },
      {
        id: 'minsk_home_categories',
        type: 'category_grid',
        order: 2,
        config: {
          title: 'Категории',
          maxCategories: 16,
          layout: 'grid',
          columns: 4,
        },
      },
      {
        id: 'minsk_home_trending',
        type: 'ad_carousel',
        order: 3,
        config: {
          title: 'Популярное в Минске',
          dataSource: 'trending',
          limit: 15,
          cityCode: 'minsk',
        },
      },
      {
        id: 'minsk_home_rental_promo',
        type: 'promo_island',
        order: 4,
        config: {
          title: 'Посуточная аренда',
          subtitle: 'Квартиры на короткий срок',
          seasonCode: 'short_term_rental',
          actionText: 'Подробнее',
          actionUrl: '/season/short_term_rental',
        },
      },
    ],
  },
  {
    cityCode: 'grodno',
    screen: 'home',
    variant: 'default',
    seasonCode: null,
    isActive: true,
    blocks: [
      {
        id: 'grodno_home_search',
        type: 'search_bar',
        order: 0,
        config: {
          placeholder: 'Найти в Гродно',
          showFilters: true,
        },
      },
      {
        id: 'grodno_home_hero',
        type: 'hero_banner',
        order: 1,
        config: {
          slotId: 'grodno_hero_main',
        },
      },
      {
        id: 'grodno_home_categories',
        type: 'category_grid',
        order: 2,
        config: {
          title: 'Категории товаров',
          maxCategories: 12,
          layout: 'grid',
          columns: 3,
        },
      },
      {
        id: 'grodno_home_trending',
        type: 'ad_carousel',
        order: 3,
        config: {
          title: 'Новое в Гродно',
          dataSource: 'trending',
          limit: 10,
          cityCode: 'grodno',
        },
      },
    ],
  },
  {
    cityCode: 'brest',
    screen: 'seasonal',
    variant: 'march8',
    seasonCode: 'march8',
    isActive: true,
    blocks: [
      {
        id: 'march8_hero',
        type: 'hero_banner',
        order: 0,
        config: {
          slotId: 'march8_hero',
        },
      },
      {
        id: 'march8_gifts',
        type: 'ad_carousel',
        order: 1,
        config: {
          title: 'Подарки к 8 марта',
          dataSource: 'season',
          seasonCode: 'march8',
          limit: 20,
          cityCode: 'brest',
        },
      },
      {
        id: 'march8_categories',
        type: 'category_grid',
        order: 2,
        config: {
          title: 'Популярные подарки',
          categories: ['flowers', 'cosmetics', 'jewelry', 'perfume'],
          layout: 'grid',
          columns: 2,
        },
      },
    ],
  },
];

async function seedLayouts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    await CityLayout.deleteMany({});
    console.log('🗑️  Cleared existing layouts');

    const inserted = await CityLayout.insertMany(layouts);
    console.log(`✅ Inserted ${inserted.length} city layouts:`);
    inserted.forEach((layout) => {
      console.log(
        `   - ${layout.cityCode} / ${layout.screen} / ${layout.variant} (${layout.blocks.length} blocks)`
      );
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding layouts:', error);
    process.exit(1);
  }
}

seedLayouts();
