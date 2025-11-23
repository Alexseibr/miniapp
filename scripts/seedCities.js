import mongoose from 'mongoose';
import dotenv from 'dotenv';
import City from '../models/City.js';

dotenv.config();

const cities = [
  {
    code: 'brest',
    name: 'Брест',
    displayName: 'Брест',
    timezone: 'Europe/Minsk',
    isActive: true,
    theme: {
      primaryColor: '#2563eb',
      accentColor: '#f59e0b',
    },
    features: {
      liveSpots: true,
      seasonalShowcases: true,
      premiumListings: true,
    },
    metadata: {
      population: 350000,
      region: 'Брестская область',
    },
  },
  {
    code: 'minsk',
    name: 'Минск',
    displayName: 'Минск',
    timezone: 'Europe/Minsk',
    isActive: true,
    theme: {
      primaryColor: '#10b981',
      accentColor: '#ef4444',
    },
    features: {
      liveSpots: true,
      seasonalShowcases: true,
      premiumListings: true,
    },
    metadata: {
      population: 2000000,
      region: 'Минская область',
    },
  },
  {
    code: 'grodno',
    name: 'Гродно',
    displayName: 'Гродно',
    timezone: 'Europe/Minsk',
    isActive: true,
    theme: {
      primaryColor: '#8b5cf6',
      accentColor: '#06b6d4',
    },
    features: {
      liveSpots: true,
      seasonalShowcases: true,
      premiumListings: true,
    },
    metadata: {
      population: 370000,
      region: 'Гродненская область',
    },
  },
];

async function seedCities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    await City.deleteMany({});
    console.log('🗑️  Cleared existing cities');

    const inserted = await City.insertMany(cities);
    console.log(`✅ Inserted ${inserted.length} cities:`);
    inserted.forEach((city) => {
      console.log(`   - ${city.displayName} (${city.code})`);
    });

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding cities:', error);
    process.exit(1);
  }
}

seedCities();
