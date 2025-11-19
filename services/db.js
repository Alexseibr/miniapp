const mongoose = require('mongoose');
const { MONGO_URL } = require('../config/config.js');

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL, { autoIndex: true });
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };
