import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

dotenv.config();

const SLOW_CATEGORY_SLUGS = [
  'nedvizhimost',
  'kvartiry',
  'doma',
  'kottedzhi',
  'komnaty',
  'garazhi',
  'uchastki',
  'prodazha-kvartir',
  'prodazha-domov',
  'arenda-kvartir-dolgosrochnaya',
  'avto-premium',
  'bmw',
  'audi',
  'mercedes',
  'mercedes-benz',
  'porsche',
  'lexus',
  'land-rover',
  'range-rover',
  'remont-bolshih-obektov',
  'stroitelstvo',
  'kapitalnyi-remont',
  'stroitelstvo-domov',
  'real-estate',
  'apartments',
  'houses',
  'cottages',
  'commercial-real-estate',
  'premium-cars',
  'luxury-cars',
];

const SLOW_CATEGORY_KEYWORDS = [
  'квартир',
  'коттедж',
  'недвижимост',
  'premium',
  'luxury',
  'элит',
  'bmw',
  'audi',
  'mercedes',
  'porsche',
  'lexus',
];

const QUICK_CATEGORY_SLUGS = [
  'lichnye-veshchi',
  'odezhda',
  'obuv',
  'detskie-tovary',
  'mebel',
  'bytovye-melochi',
  'telefony',
  'planshety',
  'elektronika',
  'fermerskiy-rynok',
  'ovoshchi',
  'frukty',
  'yagody',
  'vypechka',
  'med',
  'travy',
  'zelen',
  'domashnie-zagotovki',
  'yaytsa',
  'molochka',
  'molochnye-produkty',
  'selhoztekhnika',
  'motobloki',
  'kultivatory',
  'kombainy',
  'seyalki',
  'traktornye-pritsipy',
  'navesnoe-oborudovanie',
  'uslugi',
  'melkiy-remont',
  'uborka-uchastka',
  'kosit-travu',
  'strizhka-derevev',
  'gruzchiki',
  'melkie-uslugi',
  'arenda',
  'arenda-instrumenta',
  'arenda-selhozoborudovaniya',
  'arenda-bytovoy-tekhniki',
  'arenda-sutochno',
  'farmer',
  'agro',
  'sad-ogorod',
  'ptitsa',
  'zhivotnye',
  'korma',
  'semena',
  'sazhentsy',
  'udobreniya',
  'inventar',
];

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');

    console.log('\n1. Adding visible and slowCategory fields to all categories...');
    await Category.updateMany(
      { visible: { $exists: false } },
      { $set: { visible: true, slowCategory: false } }
    );

    console.log('\n2. Marking slow categories by slug...');
    const slowBySlug = await Category.updateMany(
      { slug: { $in: SLOW_CATEGORY_SLUGS } },
      { $set: { visible: false, slowCategory: true } }
    );
    console.log(`   Updated ${slowBySlug.modifiedCount} categories by slug`);

    console.log('\n3. Marking slow categories by keywords in name...');
    let slowByKeywordCount = 0;
    for (const keyword of SLOW_CATEGORY_KEYWORDS) {
      const result = await Category.updateMany(
        { 
          name: { $regex: keyword, $options: 'i' },
          slowCategory: { $ne: true }
        },
        { $set: { visible: false, slowCategory: true } }
      );
      slowByKeywordCount += result.modifiedCount;
    }
    console.log(`   Updated ${slowByKeywordCount} categories by keywords`);

    console.log('\n4. Hiding subcategories of slow parent categories...');
    const slowParents = await Category.find({ slowCategory: true, parentSlug: null });
    for (const parent of slowParents) {
      const result = await Category.updateMany(
        { parentSlug: parent.slug },
        { $set: { visible: false, slowCategory: true } }
      );
      if (result.modifiedCount > 0) {
        console.log(`   Hidden ${result.modifiedCount} subcategories of ${parent.name}`);
      }
    }

    console.log('\n5. Ensuring quick categories are visible...');
    const quickResult = await Category.updateMany(
      { slug: { $in: QUICK_CATEGORY_SLUGS }, visible: false },
      { $set: { visible: true, slowCategory: false } }
    );
    console.log(`   Re-enabled ${quickResult.modifiedCount} quick categories`);

    console.log('\n--- Migration Summary ---');
    const stats = await Category.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          visible: { $sum: { $cond: ['$visible', 1, 0] } },
          hidden: { $sum: { $cond: ['$visible', 0, 1] } },
          slow: { $sum: { $cond: ['$slowCategory', 1, 0] } },
        }
      }
    ]);

    if (stats.length > 0) {
      const { total, visible, hidden, slow } = stats[0];
      console.log(`Total categories: ${total}`);
      console.log(`Visible (quick): ${visible}`);
      console.log(`Hidden (slow): ${hidden}`);
      console.log(`Marked as slow: ${slow}`);
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();
