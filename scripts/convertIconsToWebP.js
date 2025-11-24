import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Category from '../models/Category.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.join(__dirname, '..', 'attached_assets', 'generated_images');

async function convertPNGtoWebP(pngPath, webpPath) {
  try {
    // Use cwebp with quality 85 and resize to 256x256
    const command = `cwebp -q 85 -resize 256 256 "${pngPath}" -o "${webpPath}"`;
    await execAsync(command);
    return true;
  } catch (error) {
    console.error(`Failed to convert ${pngPath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting PNG to WebP conversion...\n');
  
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');
  
  // Get all PNG files in generated_images
  const files = await readdir(ICONS_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));
  
  console.log(`Found ${pngFiles.length} PNG files to convert\n`);
  
  let converted = 0;
  let failed = 0;
  
  for (const pngFile of pngFiles) {
    const pngPath = path.join(ICONS_DIR, pngFile);
    const webpFile = pngFile.replace('.png', '.webp');
    const webpPath = path.join(ICONS_DIR, webpFile);
    
    console.log(`Converting: ${pngFile} → ${webpFile}`);
    
    const success = await convertPNGtoWebP(pngPath, webpPath);
    
    if (success) {
      converted++;
      
      // Update database: find categories using this PNG and update to WebP
      const oldPath = `/attached_assets/generated_images/${pngFile}`;
      const newPath = `/attached_assets/generated_images/${webpFile}`;
      
      const result = await Category.updateMany(
        { icon3d: oldPath },
        { $set: { icon3d: newPath } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`  ✅ Updated ${result.modifiedCount} categories`);
      }
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Conversion Summary:`);
  console.log(`  ✅ Successfully converted: ${converted} files`);
  console.log(`  ❌ Failed: ${failed} files`);
  
  // Verify database
  const categoriesWithIcons = await Category.countDocuments({ icon3d: { $ne: null } });
  const categoriesWithWebP = await Category.countDocuments({ icon3d: /\.webp$/ });
  const categoriesWithPNG = await Category.countDocuments({ icon3d: /\.png$/ });
  
  console.log(`\n📈 Database Status:`);
  console.log(`  Total categories with icons: ${categoriesWithIcons}`);
  console.log(`  Categories with WebP icons: ${categoriesWithWebP}`);
  console.log(`  Categories with PNG icons: ${categoriesWithPNG}`);
  
  if (categoriesWithPNG === 0) {
    console.log(`\n✅ ALL icons successfully converted to WebP format!`);
  } else {
    console.log(`\n⚠️  ${categoriesWithPNG} categories still have PNG icons`);
  }
  
  await mongoose.disconnect();
  console.log('\n✅ Disconnected from MongoDB');
}

main().catch(console.error);
