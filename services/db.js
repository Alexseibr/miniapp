const mongoose = require('mongoose');
const { getMongoUrl } = require('../config/config.js');

async function connectDB() {
  try {
    const mongoUrl = getMongoUrl();

    await mongoose.connect(mongoUrl, { autoIndex: true });
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
