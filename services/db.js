import mongoose from 'mongoose';
import { MONGO_URL } from '../config/config.js';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URL, { autoIndex: true });
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error.message);
    process.exit(1);
  }
}
