require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../services/db');
const Favorite = require('../models/Favorite');
const Ad = require('../models/Ad');

// Ensure the Ad model is registered with mongoose even if not referenced directly.
void Ad;

async function main() {
  await connectDB();

  try {
    const favorites = await Favorite.find({}).populate('adId');
    let changesDetected = 0;

    for (const favorite of favorites) {
      const ad = favorite.adId;

      if (!ad) {
        console.warn(
          `[MISSING] userTelegramId=${favorite.userTelegramId} adId=${favorite.adId} (ad removed)`
        );
        continue;
      }

      const priceChanged = favorite.lastKnownPrice !== ad.price;
      const statusChanged = favorite.lastKnownStatus !== ad.status;

      if (!priceChanged && !statusChanged) {
        continue;
      }

      const messageParts = [
        `[CHANGE] userTelegramId=${favorite.userTelegramId}`,
        `adId=${ad._id.toString()}`,
        `title="${ad.title || ''}"`,
      ];

      if (priceChanged) {
        messageParts.push(`oldPrice=${favorite.lastKnownPrice ?? 'n/a'}`);
        messageParts.push(`newPrice=${ad.price ?? 'n/a'}`);
      }

      if (statusChanged) {
        messageParts.push(`oldStatus=${favorite.lastKnownStatus ?? 'n/a'}`);
        messageParts.push(`newStatus=${ad.status ?? 'n/a'}`);
      }

      console.log(messageParts.join(' '));

      favorite.lastKnownPrice = ad.price;
      favorite.lastKnownStatus = ad.status;
      await favorite.save();
      changesDetected += 1;
    }

    if (changesDetected === 0) {
      console.log('✅ No favorite changes detected.');
    } else {
      console.log(`ℹ️ Processed ${changesDetected} favorite change(s).`);
    }
  } catch (error) {
    console.error('checkFavoritesChanges error:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('checkFavoritesChanges fatal error:', error);
  mongoose.disconnect().finally(() => process.exit(1));
});
