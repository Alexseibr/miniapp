const mongoose = require('mongoose');
const config = require('../config/config.js');
const { initIndexes } = require('../utils/initIndexes');

async function connectDB() {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(config.mongoUrl, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    const connection = mongoose.connection;
    console.log('✅ MongoDB Connected:', connection.host);
    console.log('📊 Database:', connection.name);

    const shouldSyncIndexes = process.env.NODE_ENV !== 'production' || process.env.SYNC_INDEXES === 'true';

    if (shouldSyncIndexes) {
      await initIndexes();
    }

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

module.exports = connectDB;
