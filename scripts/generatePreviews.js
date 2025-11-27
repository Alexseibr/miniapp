import mongoose from 'mongoose';
import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AdSchema = new mongoose.Schema({
  photos: [String],
  previewUrl: String,
}, { strict: false });

const Ad = mongoose.model('Ad', AdSchema);

const storage = new Storage();
const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

async function generatePreview(originalUrl) {
  try {
    if (!originalUrl) return null;
    
    const filename = originalUrl.split('/').pop();
    if (!filename) return null;
    
    const file = storage.bucket(bucketName).file(`public/${filename}`);
    const [exists] = await file.exists();
    
    if (!exists) {
      console.log(`  File not found: ${filename}`);
      return null;
    }
    
    const [buffer] = await file.download();
    
    const previewBuffer = await sharp(buffer)
      .resize(600, 600, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 75 })
      .toBuffer();
    
    const previewFilename = `preview_${filename.replace(/\.[^.]+$/, '.jpg')}`;
    const previewFile = storage.bucket(bucketName).file(`public/${previewFilename}`);
    
    await previewFile.save(previewBuffer, {
      contentType: 'image/jpeg',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    console.log(`  Created preview: ${previewFilename}`);
    return `https://storage.googleapis.com/${bucketName}/public/${previewFilename}`;
  } catch (error) {
    console.error(`  Error generating preview: ${error.message}`);
    return null;
  }
}

async function run() {
  console.log('=== Photo Preview Generator ===\n');
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');
  
  const ads = await Ad.find({
    photos: { $exists: true, $ne: [] },
    previewUrl: { $exists: false },
  }).limit(100);
  
  console.log(`Found ${ads.length} ads without preview\n`);
  
  let processed = 0;
  let errors = 0;
  
  for (const ad of ads) {
    console.log(`Processing ad ${ad._id}...`);
    
    const firstPhoto = ad.photos?.[0];
    if (!firstPhoto) {
      console.log('  No photos, skipping');
      continue;
    }
    
    const previewUrl = await generatePreview(firstPhoto);
    
    if (previewUrl) {
      await Ad.updateOne({ _id: ad._id }, { previewUrl });
      processed++;
      console.log(`  Updated with preview: ${previewUrl}`);
    } else {
      errors++;
      console.log('  Failed to generate preview');
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  
  await mongoose.disconnect();
  console.log('\nDone!');
}

run().catch(console.error);
