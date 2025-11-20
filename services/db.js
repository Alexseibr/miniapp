const mongoose = require('mongoose');
const config = require('../config/config.js');
const User = require('../models/User');

async function connectDB() {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(config.mongoUrl, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    const connection = mongoose.connection;
    console.log('✅ MongoDB Connected:', connection.host);
    console.log('📊 Database:', connection.name);

    try {
      await User.syncIndexes();
      console.log('✅ User indexes synced');
    } catch (indexError) {
      console.warn('⚠️  Failed to sync User indexes:', indexError.message);
    }

    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

module.exports = connectDB;
