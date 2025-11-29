import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import SellerProfile from '../../models/SellerProfile.js';
import Ad from '../../models/Ad.js';
import { haversineDistanceKm } from '../../utils/haversine.js';

const router = Router();

function pickLocationFromProfile(profile) {
  if (profile?.geo?.coordinates?.length === 2) {
    const [lng, lat] = profile.geo.coordinates;
    return { lat, lng };
  }
  if (profile?.baseLocation?.lat != null && profile?.baseLocation?.lng != null) {
    return { lat: Number(profile.baseLocation.lat), lng: Number(profile.baseLocation.lng) };
  }
  return null;
}

function summarizePrices(ads) {
  if (!ads.length) {
    return { min: null, max: null, avg: null };
  }
  const prices = ads.map((a) => a.price).filter((p) => typeof p === 'number');
  if (!prices.length) {
    return { min: null, max: null, avg: null };
  }
  const sum = prices.reduce((acc, val) => acc + val, 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round((sum / prices.length) * 100) / 100,
  };
}

router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const profile = await SellerProfile.findOne({ userId: user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Профиль магазина не найден' });
    }

    const homeLocation = pickLocationFromProfile(profile);
    const ownAds = await Ad.find({ shopProfileId: profile._id }).lean();
    const categories = [...new Set(ownAds.map((ad) => ad.categoryId).filter(Boolean))];

    const shopRole = profile.shopRole || 'SHOP';
    
    const response = {
      role: shopRole,
      metrics: {
        categories,
        ownProducts: ownAds.length,
      },
      recommendations: [],
    };

    if (shopRole === 'SHOP') {
      const competitorQuery = {
        shopProfileId: { $ne: profile._id },
        status: 'active',
      };
      if (categories.length) {
        competitorQuery.categoryId = { $in: categories };
      }

      const competitors = await Ad.find(competitorQuery)
        .select('price location categoryId shopProfileId')
        .limit(400)
        .lean();

      let nearby = competitors;
      if (homeLocation) {
        nearby = competitors.filter((ad) => {
          if (!ad.location?.lat || !ad.location?.lng) return false;
          const distance = haversineDistanceKm(
            homeLocation.lat,
            homeLocation.lng,
            Number(ad.location.lat),
            Number(ad.location.lng)
          );
          return distance != null && distance <= 3;
        });
      }

      response.metrics.competitorsNearby = nearby.length;
      response.metrics.priceRange = summarizePrices(nearby);
      response.recommendations.push('Добавьте точный адрес магазина для корректной аналитики конкурентов');
    } else if (shopRole === 'FARMER' || shopRole === 'ARTISAN') {
      const radiusKm = profile.deliveryRadiusKm || 30;
      const peerQuery = {
        shopProfileId: { $ne: profile._id },
        status: 'active',
      };
      if (categories.length) {
        peerQuery.categoryId = { $in: categories };
      }
      
      const peerAds = await Ad.find(peerQuery)
        .select('price location categoryId shopProfileId')
        .limit(400)
        .lean();

      let deliverablePeers = peerAds;
      if (homeLocation) {
        deliverablePeers = peerAds.filter((ad) => {
          if (!ad.location?.lat || !ad.location?.lng) return false;
          const distance = haversineDistanceKm(
            homeLocation.lat,
            homeLocation.lng,
            Number(ad.location.lat),
            Number(ad.location.lng)
          );
          return distance != null && distance <= radiusKm;
        });
      }

      response.metrics.deliveryRadiusKm = radiusKm;
      response.metrics.nearbyPeers = deliverablePeers.length;
      response.metrics.priceRange = summarizePrices(deliverablePeers);
      response.recommendations.push('Отметьте стартовую точку и радиус доставки, чтобы покупатели видели, что вы привезёте товар');
    }

    return res.json({ success: true, data: response });
  } catch (error) {
    console.error('[ShopAnalytics] overview error', error);
    return res.status(500).json({ message: 'Не удалось получить аналитику' });
  }
});

export default router;
