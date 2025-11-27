import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const AdSchema = new mongoose.Schema({}, { strict: false, collection: 'ads' });
const Ad = mongoose.model('Ad', AdSchema);

async function migratePhotoUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const ads = await Ad.find({ photos: { $exists: true, $ne: [] } });
    console.log(`Found ${ads.length} ads with photos`);
    
    let updated = 0;
    
    for (const ad of ads) {
      let modified = false;
      const newPhotos = ad.photos.map(photoUrl => {
        if (photoUrl.startsWith('https://storage.googleapis.com/')) {
          const url = new URL(photoUrl);
          const pathParts = url.pathname.split('/');
          const bucketName = pathParts[1];
          const objectName = pathParts.slice(2).join('/');
          modified = true;
          return `/api/media/${bucketName}/${objectName}`;
        }
        return photoUrl;
      });
      
      if (modified) {
        await Ad.updateOne({ _id: ad._id }, { $set: { photos: newPhotos } });
        updated++;
        console.log(`✅ Updated ad ${ad._id}: ${newPhotos.join(', ')}`);
      }
    }
    
    console.log(`\n✅ Migration complete: ${updated} ads updated`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migratePhotoUrls();
