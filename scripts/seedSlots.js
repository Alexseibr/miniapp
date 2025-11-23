import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ContentSlot from '../models/ContentSlot.js';

dotenv.config();

const slots = [
  {
    slotId: 'brest_hero_main',
    type: 'hero_banner',
    isActive: true,
    data: {
      title: 'KETMAR Маркет — Брест',
      subtitle: 'Покупайте и продавайте с удовольствием',
      imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=1200&h=400&fit=crop',
      link: '/categories',
      actionText: 'Все категории',
    },
  },
  {
    slotId: 'minsk_hero_main',
    type: 'hero_banner',
    isActive: true,
    data: {
      title: 'Минск — сердце торговли',
      subtitle: 'Найдите всё, что нужно, рядом с вами',
      imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop',
      link: '/categories',
      actionText: 'Начать покупки',
    },
  },
  {
    slotId: 'grodno_hero_main',
    type: 'hero_banner',
    isActive: true,
    data: {
      title: 'Гродно Маркет',
      subtitle: 'Открой для себя лучшие предложения',
      imageUrl: 'https://images.unsplash.com/photo-1555421689-d68471e189f2?w=1200&h=400&fit=crop',
      link: '/categories',
      actionText: 'Посмотреть',
    },
  },
  {
    slotId: 'march8_hero',
    type: 'hero_banner',
    isActive: true,
    data: {
      title: '8 Марта — Праздник Весны',
      subtitle: 'Особенные подарки для самых близких',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=400&fit=crop',
      link: '/season/march8',
      actionText: 'Выбрать подарок',
    },
  },
  {
    slotId: 'short_rental_promo',
    type: 'promo_banner',
    isActive: true,
    data: {
      title: 'Посуточная аренда',
      subtitle: 'Квартиры и дома на короткий срок',
      imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=300&fit=crop',
      link: '/season/short_term_rental',
      actionText: 'Смотреть объявления',
    },
  },
];

async function seedSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    await ContentSlot.deleteMany({});
    console.log('🗑️  Cleared existing content slots');

    const inserted = await ContentSlot.insertMany(slots);
    console.log(`✅ Inserted ${inserted.length} content slots:`);
    inserted.forEach((slot) => {
      console.log(`   - ${slot.slotId} (${slot.type}) — ${slot.data.title}`);
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding content slots:', error);
    process.exit(1);
  }
}

seedSlots();
