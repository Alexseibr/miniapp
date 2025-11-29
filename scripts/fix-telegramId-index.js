/**
 * Migration script to fix telegramId index issue
 * 
 * Problem: Users created via SMS have telegramId: null, which conflicts with
 * the unique sparse index on telegramId field.
 * 
 * Solution:
 * 1. Unset telegramId where it's null
 * 2. Drop the existing telegramId_1 index
 * 3. Recreate with partial filter expression
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

async function fixTelegramIdIndex() {
  console.log('[Migration] Starting telegramId index fix...');
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[Migration] Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    const nullCount = await usersCollection.countDocuments({ telegramId: null });
    console.log(`[Migration] Found ${nullCount} users with telegramId: null`);
    
    if (nullCount > 0) {
      const updateResult = await usersCollection.updateMany(
        { telegramId: null },
        { $unset: { telegramId: 1 } }
      );
      console.log(`[Migration] Unset telegramId for ${updateResult.modifiedCount} users`);
    }
    
    try {
      await usersCollection.dropIndex('telegramId_1');
      console.log('[Migration] Dropped existing telegramId_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('[Migration] Index telegramId_1 does not exist, skipping drop');
      } else {
        throw err;
      }
    }
    
    await usersCollection.createIndex(
      { telegramId: 1 },
      {
        unique: true,
        partialFilterExpression: { 
          telegramId: { $exists: true, $type: 'number' } 
        },
        name: 'telegramId_1'
      }
    );
    console.log('[Migration] Created new telegramId index with partial filter');
    
    const remainingNull = await usersCollection.countDocuments({ telegramId: null });
    console.log(`[Migration] Verification: ${remainingNull} users with telegramId: null remaining`);
    
    console.log('[Migration] Complete!');
    
  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

fixTelegramIdIndex()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
