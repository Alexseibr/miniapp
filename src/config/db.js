import mongoose from 'mongoose';

const { MONGODB_URI = 'mongodb://localhost:27017/miniapp' } = process.env;

export async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true,
    });
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error.message);
    process.exit(1);
  }
}
