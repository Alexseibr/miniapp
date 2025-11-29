import Ad from '../models/Ad.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const OLD_CATEGORIES_TO_CLEAN = [
  'noutbuki-kompyutery',
  'telefony-planshety',
  'nedvizhimost',
  'avto',
  'moto',
  'elektronika',
  'bytovaya-tehnika',
  'mebel',
  'obuv',
  'odezhda',
  'detskie-tovary',
  'sport',
  'hobbi',
  'krasota',
  'remont',
  'zhivotnye',
  'uslugi',
  'vakansii',
  'transport',
  'audio-tehnika',
  'aksessuary',
];

const TEST_SELLER_IDS = [123456789, 374243315];

async function cleanupOldTestAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Поиск старых тестовых объявлений...\n');

    const beforeCount = await Ad.countDocuments();
    console.log(`📊 Всего объявлений в базе: ${beforeCount}\n`);

    const deleteQueries = [
      {
        sellerTelegramId: { $in: TEST_SELLER_IDS },
        categoryId: { $in: OLD_CATEGORIES_TO_CLEAN },
      },
      {
        title: { $regex: /MacBook|iPhone|Samsung|Lenovo|ASUS|ThinkPad/i },
        sellerTelegramId: { $in: TEST_SELLER_IDS },
      },
      {
        title: { $regex: /квартир|комнат|дом|участок/i },
        sellerTelegramId: { $in: TEST_SELLER_IDS },
      },
    ];

    let totalDeleted = 0;

    for (const query of deleteQueries) {
      const matchingAds = await Ad.find(query).select('title categoryId').limit(10);
      if (matchingAds.length > 0) {
        console.log(`Найдено объявлений по запросу: ${matchingAds.length}`);
        matchingAds.slice(0, 3).forEach(ad => {
          console.log(`  - ${ad.title.substring(0, 50)}... (${ad.categoryId})`);
        });

        const result = await Ad.deleteMany(query);
        totalDeleted += result.deletedCount;
        console.log(`  ✓ Удалено: ${result.deletedCount}\n`);
      }
    }

    const afterCount = await Ad.countDocuments();
    
    console.log('========================================');
    console.log('📊 ИТОГИ ОЧИСТКИ');
    console.log('========================================');
    console.log(`Было объявлений: ${beforeCount}`);
    console.log(`Удалено: ${totalDeleted}`);
    console.log(`Осталось: ${afterCount}`);

    const remainingByCategory = await Ad.aggregate([
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    console.log('\n📁 Топ категорий по количеству объявлений:');
    remainingByCategory.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Очистка завершена!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupOldTestAds();
