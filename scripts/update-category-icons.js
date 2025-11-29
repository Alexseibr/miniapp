import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const categorySchema = new mongoose.Schema({}, { strict: false });
const Category = mongoose.model('Category', categorySchema, 'categories');

const iconMapping = {
  'nedvizhimost': '/attached_assets/real-estate.webp',
  'uslugi': '/attached_assets/services.webp',
  'puteshestviya': '/attached_assets/travel.webp',
  'remont-stroyka': '/attached_assets/repair.webp',
  'avto-zapchasti': '/attached_assets/auto.webp',
  'hobbi-sport-turizm': '/attached_assets/hobby-sport.webp',
  'elektronika': '/attached_assets/electronics.webp',
  'bytovaya-tehnika': '/attached_assets/appliances.webp',
  'odezhda-obuv': '/attached_assets/clothes.webp',
  'dom-sad': '/attached_assets/home-garden.webp',
  'detskiy-mir': '/attached_assets/kids.webp',
  'zhivotnye': '/attached_assets/pets.webp',
  'krasota-zdorove': '/attached_assets/beauty.webp',
  'rabota': '/attached_assets/jobs.webp',
};

async function updateIcons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    for (const [slug, iconPath] of Object.entries(iconMapping)) {
      const result = await Category.updateOne(
        { slug: slug },
        { $set: { icon3d: iconPath } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${slug}: ${iconPath}`);
      }
    }
    
    console.log('\n✨ Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateIcons();
