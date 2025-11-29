import Ad from '../models/Ad.js';
import User from '../models/User.js';
import SellerProfile from '../models/SellerProfile.js';
import ngeohash from 'ngeohash';

class FarmerRegionService {
  static FARMER_CATEGORY_SLUGS = [
    'farmer-market',
    'farmer-vegetables',
    'farmer-fruits',
    'farmer-berries',
    'farmer-dairy',
    'farmer-meat',
    'farmer-honey',
    'farmer-bakery',
    'farmer-mushrooms',
    'farmer-seedlings',
    'farmer-feed',
    'farmer-seasonal',
  ];

  static async getFarmersInRegion(regionId, options = {}) {
    const { limit = 100, includeInactive = false } = options;
    
    try {
      const farmerTelegramIds = new Set();
      
      const geoPrefix = regionId.substring(0, 4);
      
      const activeAds = await Ad.aggregate([
        {
          $match: {
            status: { $in: ['active', 'published'] },
            $or: [
              { categoryId: { $regex: /^farmer-/ } },
              { subcategoryId: { $regex: /^farmer-/ } },
              { isFarmerAd: true },
            ],
          },
        },
        {
          $addFields: {
            geoHash: {
              $cond: {
                if: { $and: ['$location.lat', '$location.lng'] },
                then: { $literal: null },
                else: null,
              },
            },
          },
        },
      ]);
      
      for (const ad of activeAds) {
        if (ad.location?.lat && ad.location?.lng) {
          const adGeoHash = ngeohash.encode(ad.location.lat, ad.location.lng, 5);
          if (adGeoHash.startsWith(geoPrefix)) {
            if (ad.sellerTelegramId) {
              farmerTelegramIds.add(ad.sellerTelegramId);
            }
          }
        } else if (ad.city) {
          if (ad.sellerTelegramId) {
            farmerTelegramIds.add(ad.sellerTelegramId);
          }
        }
      }
      
      const farmerProfiles = await SellerProfile.find({
        isFarmer: true,
        isActive: true,
      })
        .select('telegramId')
        .lean();
      
      for (const profile of farmerProfiles) {
        if (profile.telegramId) {
          farmerTelegramIds.add(profile.telegramId);
        }
      }
      
      if (includeInactive) {
        const historicalAds = await Ad.find({
          $or: [
            { categoryId: { $regex: /^farmer-/ } },
            { subcategoryId: { $regex: /^farmer-/ } },
          ],
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        })
          .select('sellerTelegramId location')
          .lean();
        
        for (const ad of historicalAds) {
          if (ad.location?.lat && ad.location?.lng) {
            const adGeoHash = ngeohash.encode(ad.location.lat, ad.location.lng, 5);
            if (adGeoHash.startsWith(geoPrefix)) {
              if (ad.sellerTelegramId) {
                farmerTelegramIds.add(ad.sellerTelegramId);
              }
            }
          }
        }
      }
      
      const farmers = [];
      for (const telegramId of farmerTelegramIds) {
        if (farmers.length >= limit) break;
        
        const user = await User.findOne({ telegramId }).select('_id telegramId firstName').lean();
        if (user) {
          farmers.push({
            farmerId: user._id,
            telegramId: user.telegramId,
            firstName: user.firstName,
          });
        }
      }
      
      return farmers;
    } catch (error) {
      console.error('[FarmerRegionService] getFarmersInRegion error:', error);
      return [];
    }
  }

  static async getFarmersByGeoHash(geoHash, options = {}) {
    const { limit = 100 } = options;
    
    try {
      const geoPrefix = geoHash.substring(0, 4);
      
      const ads = await Ad.find({
        geoHash: { $regex: `^${geoPrefix}` },
        status: { $in: ['active', 'published'] },
        $or: [
          { categoryId: { $regex: /^farmer-/ } },
          { isFarmerAd: true },
        ],
      })
        .select('sellerTelegramId')
        .limit(limit * 2)
        .lean();
      
      const telegramIds = [...new Set(ads.map(a => a.sellerTelegramId).filter(Boolean))];
      
      const farmers = await User.find({
        telegramId: { $in: telegramIds.slice(0, limit) },
      })
        .select('_id telegramId firstName')
        .lean();
      
      return farmers.map(u => ({
        farmerId: u._id,
        telegramId: u.telegramId,
        firstName: u.firstName,
      }));
    } catch (error) {
      console.error('[FarmerRegionService] getFarmersByGeoHash error:', error);
      return [];
    }
  }

  static async countFarmersInRegion(regionId) {
    try {
      const geoPrefix = regionId.substring(0, 4);
      
      const count = await Ad.distinct('sellerTelegramId', {
        geoHash: { $regex: `^${geoPrefix}` },
        status: { $in: ['active', 'published'] },
        $or: [
          { categoryId: { $regex: /^farmer-/ } },
          { isFarmerAd: true },
        ],
      });
      
      return count.length;
    } catch (error) {
      console.error('[FarmerRegionService] countFarmersInRegion error:', error);
      return 0;
    }
  }
}

export default FarmerRegionService;
