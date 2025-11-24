import Category from '../models/Category.js';
import Ad from '../models/Ad.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function generateReport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Fetch all categories
    const categories = await Category.find({}).sort({ level: 1, name: 1 });
    const totalCategories = categories.length;
    
    // Count by level
    const levelCounts = {};
    categories.forEach(cat => {
      levelCounts[cat.level] = (levelCounts[cat.level] || 0) + 1;
    });
    
    // Separate leaf and non-leaf categories
    const leafCategories = categories.filter(c => c.isLeaf);
    const nonLeafCategories = categories.filter(c => !c.isLeaf);
    
    // Count categories with 3D icons
    const with3DIcons = categories.filter(c => c.icon3d).length;
    
    // Get test ads count
    const totalTestAds = await Ad.countDocuments();
    
    // Get ads by category
    const adsByCategory = {};
    for (const category of leafCategories) {
      const count = await Ad.countDocuments({ 
        $or: [
          { categoryId: category.slug },
          { subcategoryId: category.slug }
        ]
      });
      if (count > 0) {
        adsByCategory[category.slug] = count;
      }
    }
    
    // Build categories data
    const categoriesData = categories.map(cat => {
      const childCount = categories.filter(c => c.parentSlug === cat.slug).length;
      return {
        slug: cat.slug,
        name: cat.name,
        level: cat.level,
        isLeaf: cat.isLeaf,
        icon3d: cat.icon3d || null,
        children: childCount,
        hasIcon: !!cat.icon3d,
      };
    });
    
    // Build leaf categories data with ad counts
    const leafCategoriesData = leafCategories.map(cat => ({
      slug: cat.slug,
      name: cat.name,
      level: cat.level,
      icon3d: cat.icon3d || null,
      testAdsCreated: adsByCategory[cat.slug] || 0,
    }));
    
    // Get sample test ads
    const sampleAds = await Ad.find()
      .limit(50)
      .select('title categoryId subcategoryId price photos city')
      .sort({ createdAt: -1 });
    
    const testAdsData = sampleAds.map(ad => ({
      title: ad.title,
      categorySlug: ad.subcategoryId,
      price: ad.price,
      city: ad.city,
      photos: ad.photos || [],
    }));
    
    // Build the report
    const report = {
      timestamp: new Date().toISOString(),
      generatedBy: 'KETMAR Market Category System',
      summary: {
        totalCategories,
        leafCategories: leafCategories.length,
        nonLeafCategories: nonLeafCategories.length,
        levels: levelCounts,
        with3DIcons,
        without3DIcons: totalCategories - with3DIcons,
        iconCoverage: `${((with3DIcons / totalCategories) * 100).toFixed(1)}%`,
        totalTestAds,
        categoriesWithAds: Object.keys(adsByCategory).length,
      },
      categories: categoriesData,
      leafCategories: leafCategoriesData,
      nonLeafCategories: nonLeafCategories.map(cat => ({
        slug: cat.slug,
        name: cat.name,
        level: cat.level,
        children: categories.filter(c => c.parentSlug === cat.slug).length,
      })),
      testAdsSample: testAdsData,
      adsByCategory,
      levelBreakdown: Object.keys(levelCounts).map(level => ({
        level: parseInt(level),
        count: levelCounts[level],
        percentage: `${((levelCounts[level] / totalCategories) * 100).toFixed(1)}%`,
      })),
    };
    
    // Write report to file
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, 'category-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n========================================');
    console.log('REPORT SUMMARY');
    console.log('========================================');
    console.log(`Total categories: ${totalCategories}`);
    console.log(`Leaf categories: ${leafCategories.length}`);
    console.log(`Non-leaf categories: ${nonLeafCategories.length}`);
    console.log(`\nCategories by level:`);
    Object.keys(levelCounts).sort().forEach(level => {
      console.log(`  Level ${level}: ${levelCounts[level]}`);
    });
    console.log(`\nWith 3D icons: ${with3DIcons} (${((with3DIcons / totalCategories) * 100).toFixed(1)}%)`);
    console.log(`Without 3D icons: ${totalCategories - with3DIcons}`);
    console.log(`\nTotal test ads: ${totalTestAds}`);
    console.log(`Categories with ads: ${Object.keys(adsByCategory).length}`);
    
    console.log('\n========================================');
    console.log('TOP CATEGORIES WITH ADS');
    console.log('========================================');
    const sortedCategories = Object.entries(adsByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedCategories.forEach(([slug, count]) => {
      const cat = categories.find(c => c.slug === slug);
      console.log(`  • ${cat?.name || slug}: ${count} ads`);
    });
    
    console.log('\n========================================');
    console.log(`✓ Report generated: ${reportPath}`);
    console.log('========================================');
    
    await mongoose.disconnect();
    console.log('\n✓ Database disconnected');
    
  } catch (error) {
    console.error('Error generating report:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

generateReport();
