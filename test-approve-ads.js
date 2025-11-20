require('dotenv').config();
const mongoose = require('mongoose');
const Ad = require('./models/Ad');

async function approveAllPendingAds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    const result = await Ad.updateMany(
      { moderationStatus: 'pending' },
      { $set: { moderationStatus: 'approved' } }
    );

    console.log(`✅ Одобрено объявлений: ${result.modifiedCount}`);

    const approved = await Ad.find({ moderationStatus: 'approved' }).select('title location moderationStatus');
    console.log('\n📍 Одобренные объявления с координатами:');
    approved.forEach(ad => {
      console.log(`  - ${ad.title}`);
      console.log(`    Координаты: lat=${ad.location?.lat}, lng=${ad.location?.lng}`);
      console.log(`    Статус: ${ad.moderationStatus}\n`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

approveAllPendingAds();
