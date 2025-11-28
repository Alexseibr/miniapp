import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.js';
import SellerProfile from '../../models/SellerProfile.js';
import Ad from '../../models/Ad.js';
import { updateAdPrice, updateAdStatus } from '../../services/adUpdateService.js';

const router = Router();

function mapMeasureUnitToLegacy(unit) {
  switch (unit) {
    case 'pcs':
      return 'piece';
    case 'ltr':
      return 'liter';
    case 'kg':
    case 'pack':
    case 'portion':
      return unit;
    default:
      return null;
  }
}

async function getSellerProfile(userId) {
  return SellerProfile.findOne({ userId });
}

router.post('/products/draft', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const profile = await getSellerProfile(user._id);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'profile_not_found' });
    }

    if (!Number.isFinite(profile.baseLocation?.lat) || !Number.isFinite(profile.baseLocation?.lng)) {
      return res.status(400).json({
        success: false,
        error: 'base_location_required',
        message: 'Укажите базовую точку продажи перед созданием товара',
      });
    }

    const { title, description, categoryId, subcategoryId, photos = [], measureUnit } = req.body || {};

    if (!title || !categoryId) {
      return res.status(400).json({ success: false, error: 'invalid_payload', message: 'Название и категория обязательны' });
    }

    const unitType = mapMeasureUnitToLegacy(measureUnit);

    const ad = new Ad({
      title: title.trim(),
      description: description?.trim() || null,
      categoryId,
      subcategoryId: subcategoryId || categoryId,
      price: 0,
      currency: 'BYN',
      photos,
      sellerTelegramId: profile.telegramId,
      storeId: profile._id,
      status: 'draft',
      measureUnit: measureUnit || null,
      unitType: unitType || null,
      stockQuantity: null,
      quantity: null,
      geoLabel: profile.baseLocation.address || 'Точка продажи',
      location: {
        lat: profile.baseLocation.lat,
        lng: profile.baseLocation.lng,
        geo: {
          type: 'Point',
          coordinates: [profile.baseLocation.lng, profile.baseLocation.lat],
        },
      },
    });

    await ad.save();

    return res.status(201).json({ success: true, ad });
  } catch (error) {
    console.error('[MyShop] Create draft error:', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.patch('/products/:id/pricing', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const profile = await getSellerProfile(user._id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'profile_not_found' });
    }

    const ad = await Ad.findOne({ _id: req.params.id, sellerTelegramId: profile.telegramId });
    if (!ad) {
      return res.status(404).json({ success: false, error: 'ad_not_found' });
    }

    const { price, stockQuantity, measureUnit } = req.body || {};

    if (ad.status === 'active' && (price !== undefined || measureUnit !== undefined || stockQuantity !== undefined)) {
      return res.status(400).json({
        success: false,
        error: 'price_locked',
        message: 'Чтобы изменить цену, поставьте товар на паузу',
      });
    }

    let workingAd = ad;

    if (price !== undefined) {
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        return res.status(400).json({ success: false, error: 'invalid_price', message: 'Цена должна быть больше нуля' });
      }
      workingAd = await updateAdPrice(ad._id, priceNumber);
    }

    if (stockQuantity !== undefined) {
      const stockNumber = Number(stockQuantity);
      if (!Number.isFinite(stockNumber) || stockNumber < 0) {
        return res.status(400).json({ success: false, error: 'invalid_stock' });
      }
      workingAd.stockQuantity = stockNumber;
      workingAd.quantity = stockNumber;
    }

    if (measureUnit !== undefined) {
      workingAd.measureUnit = measureUnit;
      workingAd.unitType = mapMeasureUnitToLegacy(measureUnit);
    }

    await workingAd.save();

    return res.json({ success: true, ad: workingAd });
  } catch (error) {
    console.error('[MyShop] Update pricing error:', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/products/:id/publish', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const profile = await getSellerProfile(user._id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'profile_not_found' });
    }

    const ad = await Ad.findOne({ _id: req.params.id, sellerTelegramId: profile.telegramId });
    if (!ad) {
      return res.status(404).json({ success: false, error: 'ad_not_found' });
    }

    if (!ad.price || ad.price <= 0) {
      return res.status(400).json({ success: false, error: 'price_required', message: 'Укажите цену перед публикацией' });
    }

    ad.measureUnit = ad.measureUnit || req.body?.measureUnit || null;
    ad.unitType = ad.unitType || mapMeasureUnitToLegacy(ad.measureUnit);

    const updated = await updateAdStatus(ad._id, 'active');
    return res.json({ success: true, ad: updated });
  } catch (error) {
    console.error('[MyShop] Publish product error:', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

router.post('/products/:id/pause', authMiddleware, async (req, res) => {
  try {
    const user = req.currentUser;
    const profile = await getSellerProfile(user._id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'profile_not_found' });
    }

    const ad = await Ad.findOne({ _id: req.params.id, sellerTelegramId: profile.telegramId });
    if (!ad) {
      return res.status(404).json({ success: false, error: 'ad_not_found' });
    }

    const updated = await updateAdStatus(ad._id, 'paused');
    return res.json({ success: true, ad: updated });
  } catch (error) {
    console.error('[MyShop] Pause product error:', error);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

export default router;
