import Category from '../models/Category.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function populateCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // 1. Get all categories
    const categories = await Category.find({});
    console.log(`\nFound ${categories.length} categories in database`);
    
    if (categories.length === 0) {
      console.log('No categories found. Please seed categories first.');
      await mongoose.disconnect();
      return;
    }
    
    // 2. Build level map
    const levelMap = {};
    function calculateLevel(slug) {
      if (levelMap[slug]) return levelMap[slug];
      const cat = categories.find(c => c.slug === slug);
      if (!cat || !cat.parentSlug) {
        levelMap[slug] = 1;
        return 1;
      }
      levelMap[slug] = calculateLevel(cat.parentSlug) + 1;
      return levelMap[slug];
    }
    
    // 3. Calculate isLeaf
    const children = {};
    categories.forEach(cat => {
      if (cat.parentSlug) {
        children[cat.parentSlug] = true;
      }
    });
    
    // 4. Update all categories
    console.log('\nUpdating categories with level and isLeaf...\n');
    for (const cat of categories) {
      const level = calculateLevel(cat.slug);
      const isLeaf = !children[cat.slug];
      
      await Category.updateOne(
        { _id: cat._id },
        { $set: { level, isLeaf } }
      );
      
      console.log(`✓ Updated ${cat.slug.padEnd(30)} | Level: ${level} | isLeaf: ${isLeaf}`);
    }
    
    // 5. Generate statistics
    const leafCategories = await Category.find({ isLeaf: true }).sort({ slug: 1 });
    const nonLeafCategories = await Category.find({ isLeaf: false }).sort({ slug: 1 });
    
    // Count by level
    const levelCounts = {};
    categories.forEach(cat => {
      const level = calculateLevel(cat.slug);
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Total categories: ${categories.length}`);
    console.log(`Leaf categories (show ads): ${leafCategories.length}`);
    console.log(`Non-leaf categories (show subcategories): ${nonLeafCategories.length}`);
    console.log('\nCategories by level:');
    Object.keys(levelCounts).sort().forEach(level => {
      console.log(`  Level ${level}: ${levelCounts[level]}`);
    });
    
    console.log('\n========================================');
    console.log('LEAF CATEGORIES (will show ads):');
    console.log('========================================');
    leafCategories.forEach(c => {
      console.log(`  • ${c.name} (${c.slug}) - Level ${calculateLevel(c.slug)}`);
    });
    
    console.log('\n========================================');
    console.log('NON-LEAF CATEGORIES (will show subcategories):');
    console.log('========================================');
    nonLeafCategories.forEach(c => {
      const childCount = categories.filter(cat => cat.parentSlug === c.slug).length;
      console.log(`  • ${c.name} (${c.slug}) - Level ${calculateLevel(c.slug)} - ${childCount} children`);
    });
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    console.log('\n✓ Category population complete!');
  } catch (error) {
    console.error('Error populating categories:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

populateCategories();
