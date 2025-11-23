import mongoose from 'mongoose';
import * as config from '../config/config.js';

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUrl);
    
    const connection = mongoose.connection;
    console.log('✅ MongoDB Connected:', connection.host);
    console.log('📊 Database:', connection.name);
    
    return connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

export default connectDB;
