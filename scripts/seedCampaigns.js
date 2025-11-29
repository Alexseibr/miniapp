import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Season from '../models/Season.js';

dotenv.config();

const CAMPAIGNS = [
  {
    code: 'march8_tulips',
    name: 'Тюльпаны 8 марта',
    description: 'Весенние цветы и букеты к 8 марта. Закажи тюльпаны для любимых!',
    type: 'store',
    startDate: new Date('2025-02-20'),
    endDate: new Date('2025-03-10'),
    isActive: false,
    specialFilters: { enableTulips: true },
  },
  {
    code: 'newyear_fair',
    name: 'Новогодняя ярмарка',
    description: 'Подарки, украшения и праздничные товары к Новому году!',
    type: 'store',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-31'),
    isActive: false,
  },
  {
    code: 'autumn_fair',
    name: 'Осенняя ярмарка',
    description: 'Урожай, консервация и фермерские продукты осеннего сезона.',
    type: 'farmer',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2025-10-31'),
    isActive: false,
    specialFilters: { enableFarm: true },
  },
  {
    code: 'summer_sale',
    name: 'Летняя распродажа',
    description: 'Скидки и специальные предложения на летний ассортимент!',
    type: 'both',
    startDate: new Date('2025-06-01'),
    endDate: new Date('2025-08-31'),
    isActive: false,
  },
];

async function seedCampaigns() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not set');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    for (const campaign of CAMPAIGNS) {
      const existing = await Season.findOne({ code: campaign.code });
      if (existing) {
        console.log(`Campaign "${campaign.code}" already exists, updating...`);
        await Season.updateOne({ code: campaign.code }, { $set: campaign });
      } else {
        console.log(`Creating campaign "${campaign.code}"...`);
        await Season.create(campaign);
      }
    }

    console.log('Done! Campaigns seeded:');
    const all = await Season.find({});
    console.log(all.map(c => ({ code: c.code, name: c.name, type: c.type, isActive: c.isActive })));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding campaigns:', error);
    process.exit(1);
  }
}

seedCampaigns();
