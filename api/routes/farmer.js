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
          key: 'location.geo',
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
              key: 'location.geo',
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

router.post('/bulk-ads', async (req, res) => {
  try {
    const { ads, sellerTelegramId, lat, lng } = req.body;
    
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Массив объявлений обязателен',
      });
    }

    if (!sellerTelegramId) {
      return res.status(400).json({
        success: false,
        error: 'sellerTelegramId обязателен',
      });
    }

    if (ads.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Максимум 10 объявлений за раз',
      });
    }

    const validAds = ads.filter(ad => ad.title && ad.title.trim() && ad.price > 0);
    
    if (validAds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Добавьте хотя бы один товар с названием и ценой',
      });
    }

    const createdAds = [];
    const errors = [];

    for (let i = 0; i < validAds.length; i++) {
      const adData = validAds[i];
      try {
        const suggestion = FarmerCategoryService.suggestFarmerCategory(adData.title);
        const categorySlug = adData.subcategoryId || suggestion?.slug || 'farmer-other';
        
        let pricePerKg = null;
        if (adData.unitType && adData.price) {
          pricePerKg = FarmerCategoryService.calculatePricePerKg(
            adData.price, 
            adData.unitType, 
            adData.quantity || 1
          );
        }

        const ad = new Ad({
          title: adData.title.trim(),
          description: adData.description || '',
          categoryId: 'farmer-market',
          subcategoryId: categorySlug,
          price: adData.price,
          currency: 'BYN',
          unitType: adData.unitType || 'kg',
          quantity: adData.quantity || null,
          pricePerKg,
          photos: adData.photos || [],
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
          harvestDate: adData.harvestDate ? new Date(adData.harvestDate) : null,
          productionDate: adData.productionDate ? new Date(adData.productionDate) : null,
          isOrganic: adData.isOrganic || false,
          minQuantity: adData.minQuantity || null,
          canDeliver: adData.canDeliver || false,
          deliveryFromFarm: adData.deliveryFromFarm || false,
          status: 'active',
        });

        await ad.save();
        createdAds.push({ _id: ad._id, title: ad.title });
      } catch (error) {
        errors.push(`Товар "${adData.title}": ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: {
        created: createdAds.length,
        errors,
        ads: createdAds,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in bulk ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка при создании объявлений' 
    });
  }
});

router.get('/season-analytics', async (req, res) => {
  try {
    const { 
      city, 
      region, 
      categoryId, 
      subcategoryId, 
      period = 'month',
      from,
      to 
    } = req.query;

    let dateFrom, dateTo;
    const now = new Date();

    switch (period) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'season':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'year':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'custom':
        dateFrom = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = to ? new Date(to) : now;
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
    }

    const periodDuration = dateTo.getTime() - dateFrom.getTime();
    const prevDateFrom = new Date(dateFrom.getTime() - periodDuration);
    const prevDateTo = new Date(dateFrom.getTime());

    const matchStage = {
      isFarmerAd: true,
      createdAt: { $gte: dateFrom, $lte: dateTo },
    };

    if (city) matchStage.city = city;
    if (categoryId) matchStage.categoryId = categoryId;
    if (subcategoryId) matchStage.subcategoryId = subcategoryId;

    const prevMatchStage = {
      ...matchStage,
      createdAt: { $gte: prevDateFrom, $lte: prevDateTo },
    };

    const [currentStats, prevStats] = await Promise.all([
      Ad.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalAds: { $sum: 1 },
            activeAds: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            averagePrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            viewsTotal: { $sum: { $ifNull: ['$analytics.views', 0] } },
            contactClicksTotal: { $sum: { $ifNull: ['$analytics.contactClicks', 0] } },
          },
        },
      ]),
      Ad.aggregate([
        { $match: prevMatchStage },
        {
          $group: {
            _id: null,
            totalAds: { $sum: 1 },
            averagePrice: { $avg: '$price' },
          },
        },
      ]),
    ]);

    const current = currentStats[0] || {
      totalAds: 0,
      activeAds: 0,
      averagePrice: 0,
      minPrice: 0,
      maxPrice: 0,
      viewsTotal: 0,
      contactClicksTotal: 0,
    };

    const prev = prevStats[0] || { totalAds: 0, averagePrice: 0 };

    const priceChangePercent = prev.averagePrice > 0
      ? ((current.averagePrice - prev.averagePrice) / prev.averagePrice) * 100
      : 0;

    const adsChangePercent = prev.totalAds > 0
      ? ((current.totalAds - prev.totalAds) / prev.totalAds) * 100
      : 0;

    const conversion = current.viewsTotal > 0
      ? (current.contactClicksTotal / current.viewsTotal) * 100
      : 0;

    res.json({
      success: true,
      data: {
        categoryId: subcategoryId || categoryId || 'farmer-market',
        city: city || 'all',
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0],
        period,
        totalAds: current.totalAds,
        activeAds: current.activeAds,
        averagePrice: Math.round(current.averagePrice * 100) / 100,
        minPrice: current.minPrice || 0,
        maxPrice: current.maxPrice || 0,
        viewsTotal: current.viewsTotal,
        contactClicksTotal: current.contactClicksTotal,
        conversion: Math.round(conversion * 10) / 10,
        trend: {
          prevPeriodAveragePrice: Math.round(prev.averagePrice * 100) / 100,
          priceChangePercent: Math.round(priceChangePercent * 10) / 10,
          prevPeriodAds: prev.totalAds,
          adsChangePercent: Math.round(adsChangePercent * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in season analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения аналитики' 
    });
  }
});

router.get('/my-analytics', async (req, res) => {
  try {
    const { sellerTelegramId, subcategoryId, period = 'month' } = req.query;
    
    if (!sellerTelegramId) {
      return res.status(400).json({
        success: false,
        error: 'sellerTelegramId обязателен',
      });
    }

    const now = new Date();
    let dateFrom;

    switch (period) {
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'season':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const matchStage = {
      sellerTelegramId: parseInt(sellerTelegramId),
      isFarmerAd: true,
      createdAt: { $gte: dateFrom },
    };

    if (subcategoryId) matchStage.subcategoryId = subcategoryId;

    const [myStats, marketStats] = await Promise.all([
      Ad.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$subcategoryId',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' },
            totalViews: { $sum: { $ifNull: ['$analytics.views', 0] } },
            totalClicks: { $sum: { $ifNull: ['$analytics.contactClicks', 0] } },
          },
        },
      ]),
      Ad.aggregate([
        { 
          $match: { 
            isFarmerAd: true, 
            createdAt: { $gte: dateFrom },
            ...(subcategoryId ? { subcategoryId } : {}),
          } 
        },
        {
          $group: {
            _id: '$subcategoryId',
            marketAvgPrice: { $avg: '$price' },
            marketCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const marketMap = new Map(marketStats.map(m => [m._id, m]));

    const comparison = myStats.map(my => {
      const market = marketMap.get(my._id) || { marketAvgPrice: 0, marketCount: 0 };
      const priceDiff = market.marketAvgPrice > 0
        ? ((my.avgPrice - market.marketAvgPrice) / market.marketAvgPrice) * 100
        : 0;

      return {
        subcategoryId: my._id,
        myAdsCount: my.count,
        myAvgPrice: Math.round(my.avgPrice * 100) / 100,
        myViews: my.totalViews,
        myClicks: my.totalClicks,
        marketAvgPrice: Math.round(market.marketAvgPrice * 100) / 100,
        marketAdsCount: market.marketCount,
        priceDiffPercent: Math.round(priceDiff * 10) / 10,
        priceStatus: priceDiff > 10 ? 'above' : priceDiff < -10 ? 'below' : 'market',
      };
    });

    res.json({
      success: true,
      data: {
        period,
        from: dateFrom.toISOString().split('T')[0],
        to: now.toISOString().split('T')[0],
        categories: comparison,
        totalMyAds: myStats.reduce((sum, m) => sum + m.count, 0),
        totalViews: myStats.reduce((sum, m) => sum + m.totalViews, 0),
        totalClicks: myStats.reduce((sum, m) => sum + m.totalClicks, 0),
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in my analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения аналитики' 
    });
  }
});

export default router;
