import mongoose from 'mongoose';
import CityLayout from '../models/CityLayout.js';
import dotenv from 'dotenv';

dotenv.config();

async function createHomeLayout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const existingLayout = await CityLayout.findOne({
      cityCode: 'brest',
      screen: 'home'
    });
    
    if (existingLayout) {
      console.log('⚠️  Layout уже существует, обновляем...');
      await CityLayout.deleteOne({ _id: existingLayout._id });
    }
    
    const homeLayout = new CityLayout({
      cityCode: 'brest',
      screen: 'home',
      variant: 'default',
      isActive: true,
      priority: 100,
      blocks: [
        {
          id: 'category_grid_main',
          type: 'category_grid',
          order: 1,
          config: {
            title: 'Категории',
            showOnlyTopLevel: true,
            columns: 4,
          }
        },
        {
          id: 'ad_list_all',
          type: 'ad_list',
          order: 2,
          config: {
            title: 'Все объявления',
            limit: 20,
            sort: 'newest',
            showFilters: false,
          }
        }
      ]
    });
    
    await homeLayout.save();
    console.log('✅ Home layout created successfully!');
    console.log(`   - cityCode: ${homeLayout.cityCode}`);
    console.log(`   - screen: ${homeLayout.screen}`);
    console.log(`   - blocks: ${homeLayout.blocks.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createHomeLayout();
