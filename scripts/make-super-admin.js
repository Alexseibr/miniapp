import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function makeSuperAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const telegramId = 374243315;
    
    console.log(`🔍 Finding user with Telegram ID: ${telegramId}`);
    const user = await User.findOne({ telegramId });
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }

    console.log('📝 Current user data:');
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Username: @${user.username}`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Is moderator: ${user.isModerator}`);

    console.log('\n🔄 Updating to super_admin...');
    user.role = 'super_admin';
    user.isModerator = true;
    await user.save();

    console.log('✅ User updated successfully!');
    console.log(`   New role: ${user.role}`);
    console.log(`   Is moderator: ${user.isModerator}`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeSuperAdmin();
