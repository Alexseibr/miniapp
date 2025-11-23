require('dotenv').config();
import mongoose from 'mongoose';
import connectDB from '../services/db.js';
import { checkFavoritesForChanges } from '../notifications/watcher.js';

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
