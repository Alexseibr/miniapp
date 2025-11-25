import { Router } from 'express';
import Category from '../../models/Category.js';
import Ad from '../../models/Ad.js';
import FarmerCategoryService from '../../services/FarmerCategoryService.js';

const router = Router();

router.get('/categories', async (req, res) => {
  try {
    const tree = await FarmerCategoryService.getFarmerCategoryTree();
    
    if (!tree) {
      return res.json({
        success: true,
        data: { root: null, subcategories: [], seasonal: [] },
      });
    }

    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get farmer categories' 
    });
  }
});

router.get('/categories/active', async (req, res) => {
  try {
    const categories = await FarmerCategoryService.getActiveFarmerCategories();
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting active categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get active farmer categories' 
    });
  }
});

router.get('/categories/seasonal', async (req, res) => {
  try {
    const categories = await FarmerCategoryService.getActiveSeasonalCategories();
    
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting seasonal categories:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get seasonal categories' 
    });
  }
});

router.post('/suggest-category', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const suggestion = FarmerCategoryService.suggestFarmerCategory(text);
    
    if (!suggestion) {
      return res.json({
        success: true,
        data: null,
        message: 'No category suggestion found',
      });
    }

    const category = await Category.findOne({ slug: suggestion.slug });
    
    res.json({
      success: true,
      data: {
        category,
        confidence: suggestion.confidence,
        matchedKeyword: suggestion.matchedKeyword,
        isSeasonal: suggestion.isSeasonal,
        autoSelect: suggestion.confidence >= 0.5,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error suggesting category:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to suggest category' 
    });
  }
});

router.post('/detect-quantity', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required',
      });
    }

    const result = FarmerCategoryService.detectQuantityFromText(text);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[FarmerAPI] Error detecting quantity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to detect quantity' 
    });
  }
});

router.post('/calculate-price', async (req, res) => {
  try {
    const { price, unit, quantity, targetUnit } = req.body;
    
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price is required',
      });
    }

    const pricePerKg = FarmerCategoryService.calculatePricePerKg(price, unit, quantity || 1);
    
    let convertedPrice = null;
    if (targetUnit) {
      convertedPrice = FarmerCategoryService.convertPrice(price, unit, targetUnit);
    }

    let bagBreakdown = null;
    if (unit === 'bag' && quantity > 0) {
      bagBreakdown = FarmerCategoryService.suggestBagPriceBreakdown(price, quantity);
    }

    res.json({
      success: true,
      data: {
        pricePerKg,
        convertedPrice,
        bagBreakdown,
        formattedPrice: FarmerCategoryService.formatPriceWithUnit(price, unit),
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error calculating price:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate price' 
    });
  }
});

router.get('/ads', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 10,
      categorySlug,
      sort = 'distance',
      limit = 20,
      offset = 0,
      seasonal,
    } = req.query;

    const query = {
      isFarmerAd: true,
      status: 'active',
    };

    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        if (category.level === 1) {
          const subcats = await Category.find({ parentSlug: categorySlug });
          query.subcategoryId = { $in: subcats.map(c => c.slug) };
        } else {
          query.subcategoryId = categorySlug;
        }
      }
    } else {
      const farmerCats = await Category.find({ isFarmerCategory: true });
      query.subcategoryId = { $in: farmerCats.map(c => c.slug) };
    }

    if (seasonal === 'true') {
      const seasonalCats = await FarmerCategoryService.getActiveSeasonalCategories();
      const seasonalSlugs = seasonalCats.map(c => c.slug);
      query.subcategoryId = { $in: seasonalSlugs };
    }

    let pipeline = [{ $match: query }];

    if (lat && lng) {
      const radiusKm = parseFloat(radius);
      const radiusMeters = radiusKm * 1000;

      pipeline.unshift({
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: 'distance',
          maxDistance: radiusMeters,
          spherical: true,
        },
      });
    }

    let sortStage = {};
    switch (sort) {
      case 'price_asc':
        sortStage = { price: 1 };
        break;
      case 'price_desc':
        sortStage = { price: -1 };
        break;
      case 'newest':
        sortStage = { createdAt: -1 };
        break;
      case 'distance':
      default:
        if (lat && lng) {
          sortStage = { distance: 1 };
        } else {
          sortStage = { createdAt: -1 };
        }
    }

    pipeline.push({ $sort: sortStage });
    pipeline.push({ $skip: parseInt(offset) });
    pipeline.push({ $limit: parseInt(limit) });

    const ads = await Ad.aggregate(pipeline);

    const countPipeline = [...pipeline.slice(0, lat && lng ? 2 : 1)];
    countPipeline.push({ $count: 'total' });
    const countResult = await Ad.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        ads,
        total,
        hasMore: parseInt(offset) + ads.length < total,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting farmer ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get farmer ads' 
    });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 3 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Location (lat, lng) is required',
      });
    }

    const radiusMeters = parseFloat(radius) * 1000;

    const farmerCats = await Category.find({ 
      isFarmerCategory: true, 
      level: 2,
      isOther: { $ne: true },
    });

    const groups = await Promise.all(
      farmerCats.slice(0, 5).map(async (cat) => {
        const ads = await Ad.aggregate([
          {
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [parseFloat(lng), parseFloat(lat)],
              },
              distanceField: 'distance',
              maxDistance: radiusMeters,
              spherical: true,
              query: {
                subcategoryId: cat.slug,
                status: 'active',
                isFarmerAd: true,
              },
            },
          },
          { $limit: 4 },
        ]);

        if (ads.length === 0) return null;

        return {
          category: {
            slug: cat.slug,
            name: cat.name,
            icon3d: cat.icon3d,
          },
          ads,
          total: ads.length,
        };
      })
    );

    const validGroups = groups.filter(Boolean);

    res.json({
      success: true,
      data: {
        groups: validGroups,
        radius: parseFloat(radius),
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting nearby farmers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get nearby farmers' 
    });
  }
});

router.post('/quick-post', async (req, res) => {
  try {
    const {
      title,
      price,
      quantity,
      unitType,
      photo,
      lat,
      lng,
      sellerTelegramId,
      canDeliver,
      deliveryFromFarm,
    } = req.body;

    if (!title || !price || !sellerTelegramId) {
      return res.status(400).json({
        success: false,
        error: 'Title, price, and seller ID are required',
      });
    }

    const suggestion = FarmerCategoryService.suggestFarmerCategory(title);
    const categorySlug = suggestion?.slug || 'farmer-other';
    
    const category = await Category.findOne({ slug: categorySlug });
    const parentCategory = await Category.findOne({ slug: 'farmer-market' });

    let pricePerKg = null;
    if (unitType && quantity) {
      pricePerKg = FarmerCategoryService.calculatePricePerKg(price, unitType, quantity);
    }

    const quantityFromText = FarmerCategoryService.detectQuantityFromText(title);

    const ad = new Ad({
      title,
      description: '',
      categoryId: 'farmer-market',
      subcategoryId: categorySlug,
      price,
      currency: 'BYN',
      unitType: unitType || quantityFromText?.unit || category?.defaultUnit || 'kg',
      quantity: quantity || quantityFromText?.quantity || null,
      pricePerKg,
      photos: photo ? [photo] : [],
      sellerTelegramId,
      location: lat && lng ? {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        geo: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
      } : undefined,
      isFarmerAd: true,
      canDeliver: canDeliver || false,
      deliveryFromFarm: deliveryFromFarm || false,
      status: 'active',
      needsCategoryReview: !suggestion || suggestion.confidence < 0.5,
    });

    await ad.save();

    res.json({
      success: true,
      data: {
        ad,
        suggestedCategory: {
          slug: categorySlug,
          name: category?.name || 'Другое',
          confidence: suggestion?.confidence || 0,
          autoDetected: !!suggestion,
        },
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in quick post:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create ad' 
    });
  }
});

router.get('/units', (req, res) => {
  const units = [
    { value: 'kg', label: 'кг', labelFull: 'килограмм' },
    { value: 'g', label: 'г', labelFull: 'грамм' },
    { value: 'piece', label: 'шт', labelFull: 'штука' },
    { value: 'liter', label: 'л', labelFull: 'литр' },
    { value: 'pack', label: 'уп', labelFull: 'упаковка' },
    { value: 'jar', label: 'банка', labelFull: 'банка' },
    { value: 'bunch', label: 'пучок', labelFull: 'пучок' },
    { value: 'bag', label: 'мешок', labelFull: 'мешок' },
  ];

  res.json({
    success: true,
    data: units,
  });
});

export default router;
