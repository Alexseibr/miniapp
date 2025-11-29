#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Ad from '../models/Ad.js';
import reverseGeocodingService from '../services/ReverseGeocodingService.js';

dotenv.config();

const BATCH_SIZE = 50;
const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;

function isCoordinateString(value) {
  if (!value || typeof value !== 'string') return false;
  return coordPattern.test(value.trim());
}

async function findAdsWithCoordinateLocations() {
  const ads = await Ad.find({
    $or: [
      { city: { $regex: coordPattern } },
      { geoLabel: { $regex: coordPattern } },
      { 
        'location.lat': { $exists: true },
        'location.lng': { $exists: true },
        $or: [
          { city: { $in: [null, ''] } },
          { geoLabel: { $in: [null, ''] } }
        ]
      }
    ]
  }).lean();
  
  return ads;
}

async function fixAd(ad) {
  const lat = ad.location?.lat;
  const lng = ad.location?.lng;

  if (!lat || !lng) {
    console.log(`  [SKIP] Ad ${ad._id} has no coordinates`);
    return { status: 'skipped', reason: 'no_coords' };
  }

  const cityIsCoords = isCoordinateString(ad.city);
  const geoLabelIsCoords = isCoordinateString(ad.geoLabel);
  const needsFix = !ad.city || !ad.geoLabel || cityIsCoords || geoLabelIsCoords;

  if (!needsFix) {
    console.log(`  [OK] Ad ${ad._id} already has valid location: ${ad.geoLabel}`);
    return { status: 'ok', reason: 'already_valid' };
  }

  console.log(`  [FIX] Ad ${ad._id} - resolving coords: ${lat}, ${lng}`);
  
  const geoData = await reverseGeocodingService.reverseGeocode(lat, lng);
  
  if (!geoData) {
    console.log(`  [FAIL] Could not resolve location for ${ad._id}`);
    return { status: 'failed', reason: 'geocode_failed' };
  }

  const updateData = {};
  
  if (!ad.city || cityIsCoords) {
    updateData.city = geoData.city;
  }
  
  if (!ad.geoLabel || geoLabelIsCoords) {
    updateData.geoLabel = geoData.geoLabel;
  }

  if (Object.keys(updateData).length === 0) {
    return { status: 'ok', reason: 'nothing_to_update' };
  }

  await Ad.updateOne({ _id: ad._id }, { $set: updateData });
  
  console.log(`  [SUCCESS] Updated ${ad._id}: ${geoData.geoLabel}`);
  return { status: 'fixed', data: updateData };
}

async function main() {
  console.log('=== Fix Coordinate Locations Script ===\n');

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI or DATABASE_URL not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected!\n');

  try {
    console.log('Finding ads with coordinate locations...');
    const ads = await findAdsWithCoordinateLocations();
    console.log(`Found ${ads.length} ads to check\n`);

    if (ads.length === 0) {
      console.log('No ads need fixing!');
      return;
    }

    const stats = {
      total: ads.length,
      fixed: 0,
      skipped: 0,
      failed: 0,
      alreadyValid: 0
    };

    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
      const batch = ads.slice(i, i + BATCH_SIZE);
      console.log(`\nProcessing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(ads.length / BATCH_SIZE)}...`);

      for (const ad of batch) {
        const result = await fixAd(ad);
        
        switch (result.status) {
          case 'fixed':
            stats.fixed++;
            break;
          case 'skipped':
            stats.skipped++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'ok':
            stats.alreadyValid++;
            break;
        }
      }
    }

    console.log('\n=== Results ===');
    console.log(`Total checked: ${stats.total}`);
    console.log(`Fixed: ${stats.fixed}`);
    console.log(`Already valid: ${stats.alreadyValid}`);
    console.log(`Skipped (no coords): ${stats.skipped}`);
    console.log(`Failed: ${stats.failed}`);

  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
