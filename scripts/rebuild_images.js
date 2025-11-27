#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const AdSchema = new mongoose.Schema({}, { strict: false });
const Ad = mongoose.model('Ad', AdSchema, 'ads');

function generatePreviewUrl(photos) {
  if (!photos || photos.length === 0) {
    return null;
  }
  
  const firstPhoto = photos[0];
  if (!firstPhoto || typeof firstPhoto !== 'string') {
    return null;
  }
  
  if (firstPhoto.startsWith('data:')) {
    return null;
  }
  
  if (firstPhoto.startsWith('/api/media/') && !firstPhoto.includes('..')) {
    const baseUrl = firstPhoto.split('?')[0];
    return `${baseUrl}?w=600&q=75&f=webp`;
  }
  
  if (firstPhoto.startsWith('http://') || firstPhoto.startsWith('https://')) {
    try {
      const url = new URL(firstPhoto);
      if (url.hostname && !url.hostname.includes('..')) {
        return `/api/media/proxy?url=${encodeURIComponent(firstPhoto)}&w=600&q=75&f=webp`;
      }
    } catch {
      return null;
    }
  }
  
  return null;
}

async function rebuildImages() {
  console.log('[RebuildImages] Starting image optimization for existing ads...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[RebuildImages] Connected to MongoDB');
    
    const adsWithPhotos = await Ad.find({
      'photos.0': { $exists: true },
      previewUrl: { $in: [null, '', undefined] }
    }).lean();
    
    console.log(`[RebuildImages] Found ${adsWithPhotos.length} ads without previewUrl`);
    
    let updated = 0;
    let failed = 0;
    
    const BATCH_SIZE = 100;
    for (let i = 0; i < adsWithPhotos.length; i += BATCH_SIZE) {
      const batch = adsWithPhotos.slice(i, i + BATCH_SIZE);
      const bulkOps = [];
      
      for (const ad of batch) {
        const previewUrl = generatePreviewUrl(ad.photos);
        if (previewUrl) {
          bulkOps.push({
            updateOne: {
              filter: { _id: ad._id },
              update: { $set: { previewUrl } }
            }
          });
        }
      }
      
      if (bulkOps.length > 0) {
        const result = await Ad.bulkWrite(bulkOps);
        updated += result.modifiedCount;
        console.log(`[RebuildImages] Batch ${Math.floor(i/BATCH_SIZE) + 1}: Updated ${result.modifiedCount} ads`);
      }
    }
    
    console.log(`[RebuildImages] Complete! Updated: ${updated}, Failed: ${failed}`);
    
    const totalWithPreview = await Ad.countDocuments({
      'photos.0': { $exists: true },
      previewUrl: { $ne: null }
    });
    console.log(`[RebuildImages] Total ads with previewUrl: ${totalWithPreview}`);
    
  } catch (error) {
    console.error('[RebuildImages] Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[RebuildImages] Disconnected from MongoDB');
  }
}

rebuildImages().then(() => {
  process.exit(0);
});
