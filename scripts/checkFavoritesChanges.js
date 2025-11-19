require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../services/db');
const { checkFavoritesForChanges } = require('../notifications/watcher');

async function main() {
  await connectDB();

  try {
    await checkFavoritesForChanges();
  } catch (error) {
    console.error('checkFavoritesChanges error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('checkFavoritesChanges fatal error:', error);
  mongoose.disconnect().finally(() => process.exit(1));
});
