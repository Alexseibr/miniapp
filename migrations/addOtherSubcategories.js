import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';

dotenv.config();

async function addOtherSubcategories() {
  console.log('[Migration] Starting "Other" subcategories migration...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Migration] Connected to MongoDB');

    const rootCategories = await Category.find({ level: 1 });
    console.log(`[Migration] Found ${rootCategories.length} root categories`);

    let created = 0;
    let updated = 0;

    for (const rootCat of rootCategories) {
      const otherSlug = `${rootCat.slug}-other`;
      
      const existing = await Category.findOne({ slug: otherSlug });
      
      if (existing) {
        if (!existing.isOther) {
          existing.isOther = true;
          existing.isActive = true;
          existing.sortOrder = 999;
          await existing.save();
          updated++;
          console.log(`[Migration] Updated "${otherSlug}" - set isOther=true`);
        } else {
          console.log(`[Migration] "${otherSlug}" already exists with isOther=true`);
        }
      } else {
        const maxSortOrder = await Category.findOne({ parentSlug: rootCat.slug })
          .sort({ sortOrder: -1 })
          .select('sortOrder')
          .lean();

        const otherCategory = new Category({
          slug: otherSlug,
          name: `Другое в "${rootCat.name}"`,
          parentSlug: rootCat.slug,
          level: 2,
          isLeaf: true,
          isOther: true,
          isActive: true,
          sortOrder: (maxSortOrder?.sortOrder || 0) + 100,
          type: rootCat.type || null,
          icon: rootCat.icon,
          icon3d: rootCat.icon3d,
          keywordTokens: ['другое', 'прочее', 'разное'],
        });

        await otherCategory.save();
        created++;
        console.log(`[Migration] Created "${otherSlug}" for "${rootCat.name}"`);
      }
    }

    await Category.updateMany(
      { isOther: { $ne: true } },
      { $set: { isOther: false } }
    );

    console.log(`[Migration] Complete! Created: ${created}, Updated: ${updated}`);
    
    const otherCategories = await Category.find({ isOther: true }).select('slug name parentSlug');
    console.log('[Migration] All "Other" subcategories:');
    otherCategories.forEach(cat => {
      console.log(`  - ${cat.slug}: "${cat.name}" (parent: ${cat.parentSlug})`);
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('[Migration] Disconnected from MongoDB');
  }
}

addOtherSubcategories()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
