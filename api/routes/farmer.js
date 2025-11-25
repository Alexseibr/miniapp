import { Router } from 'express';
import Category from '../../models/Category.js';
import Ad from '../../models/Ad.js';
import SearchLog from '../../models/SearchLog.js';
import ngeohash from 'ngeohash';
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

router.get('/local-demand', async (req, res) => {
  try {
    const { lat, lng, radiusKm = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Координаты (lat, lng) обязательны',
      });
    }

    const geoHash = ngeohash.encode(parseFloat(lat), parseFloat(lng), 5);
    const now = new Date();
    const last48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const farmerCategories = await Category.find({ isFarmerCategory: true });
    const farmerCategorySlugs = farmerCategories.map(c => c.slug);

    const farmerKeywords = [
      'малина', 'клубника', 'яблоки', 'груши', 'вишня', 'черешня', 'смородина', 
      'крыжовник', 'голубика', 'ежевика', 'арбуз', 'дыня', 'виноград',
      'картошка', 'картофель', 'морковь', 'свекла', 'капуста', 'помидоры', 
      'томаты', 'огурцы', 'лук', 'чеснок', 'перец', 'баклажан', 'кабачок',
      'укроп', 'петрушка', 'салат', 'щавель', 'шпинат', 'базилик', 'зелень',
      'молоко', 'сметана', 'творог', 'сыр', 'масло', 'кефир', 'йогурт',
      'яйца', 'курица', 'мясо', 'свинина', 'говядина', 'сало',
      'мёд', 'соты', 'прополис', 'перга',
      'выпечка', 'хлеб', 'пирожки', 'булочки', 'эклеры', 'торт',
      'варенье', 'джем', 'компот', 'соленья', 'огурцы соленые', 'грибы',
      'рассада', 'саженцы', 'семена',
    ];

    const searchLogs = await SearchLog.aggregate([
      {
        $match: {
          createdAt: { $gte: last48h },
          geoHash: { $regex: `^${geoHash.substring(0, 4)}` },
        },
      },
      {
        $group: {
          _id: '$normalizedQuery',
          count: { $sum: 1 },
          lastSearch: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    const demandItems = [];
    for (const log of searchLogs) {
      const query = log._id.toLowerCase();
      const isFarmerRelated = farmerKeywords.some(kw => 
        query.includes(kw) || kw.includes(query)
      );

      if (isFarmerRelated && log.count >= 2) {
        const suggestion = FarmerCategoryService.suggestFarmerCategory(query);
        demandItems.push({
          query: log._id,
          count: log.count,
          lastSearch: log.lastSearch,
          category: suggestion?.slug || null,
          categoryName: suggestion ? 
            farmerCategories.find(c => c.slug === suggestion.slug)?.name : null,
        });
      }
    }

    demandItems.sort((a, b) => b.count - a.count);

    const topDemand = demandItems.slice(0, 10);
    const summary = topDemand.length > 0
      ? `В вашем районе ищут: ${topDemand.slice(0, 5).map(d => d.query).join(', ')}`
      : 'Пока нет активных запросов рядом';

    res.json({
      success: true,
      data: {
        items: topDemand,
        summary,
        radiusKm: parseFloat(radiusKm),
        geoHash,
        totalSearches: searchLogs.reduce((sum, s) => sum + s.count, 0),
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in local demand:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения спроса' 
    });
  }
});

router.get('/dashboard-ads', async (req, res) => {
  try {
    const { sellerTelegramId, status, limit = 20, offset = 0 } = req.query;

    if (!sellerTelegramId) {
      return res.status(400).json({
        success: false,
        error: 'sellerTelegramId обязателен',
      });
    }

    const matchStage = {
      sellerTelegramId: parseInt(sellerTelegramId),
      isFarmerAd: true,
    };

    if (status && status !== 'all') {
      matchStage.status = status;
    }

    const now = new Date();
    const ads = await Ad.find(matchStage)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const adsWithStatus = ads.map(ad => {
      let displayStatus = ad.status;
      let statusLabel = 'Активно';
      let statusColor = '#10B981';

      if (ad.status === 'expired') {
        statusLabel = 'Истекло';
        statusColor = '#6B7280';
      } else if (ad.status === 'archived') {
        statusLabel = 'В архиве';
        statusColor = '#6B7280';
      } else if (ad.isSoldOut) {
        displayStatus = 'sold_out';
        statusLabel = 'Закончилось';
        statusColor = '#EF4444';
      } else if (ad.expiresAt) {
        const hoursLeft = (new Date(ad.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft <= 0) {
          displayStatus = 'expired';
          statusLabel = 'Истекло';
          statusColor = '#6B7280';
        } else if (hoursLeft <= 24) {
          displayStatus = 'expiring_soon';
          statusLabel = 'Скоро исчезнет';
          statusColor = '#F59E0B';
        }
      }

      return {
        ...ad,
        displayStatus,
        statusLabel,
        statusColor,
        metrics: {
          views: ad.analytics?.views || 0,
          contactClicks: ad.analytics?.contactClicks || 0,
          favorites: ad.analytics?.favorites || 0,
        },
      };
    });

    const total = await Ad.countDocuments(matchStage);

    const stats = await Ad.aggregate([
      { $match: { sellerTelegramId: parseInt(sellerTelegramId), isFarmerAd: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts = {
      active: 0,
      expired: 0,
      archived: 0,
      scheduled: 0,
    };
    stats.forEach(s => {
      statusCounts[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        ads: adsWithStatus,
        total,
        hasMore: parseInt(offset) + ads.length < total,
        statusCounts,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in dashboard ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения объявлений' 
    });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const { sellerTelegramId, limit = 20 } = req.query;

    if (!sellerTelegramId) {
      return res.status(400).json({
        success: false,
        error: 'sellerTelegramId обязателен',
      });
    }

    const sellerAds = await Ad.find({
      sellerTelegramId: parseInt(sellerTelegramId),
      isFarmerAd: true,
      status: 'active',
    }).lean();

    const notifications = [];
    const now = new Date();

    for (const ad of sellerAds) {
      if (ad.expiresAt) {
        const hoursLeft = (new Date(ad.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft > 0 && hoursLeft <= 24) {
          notifications.push({
            type: 'expiring_soon',
            icon: '⏰',
            title: 'Скоро исчезнет',
            message: `"${ad.title}" истекает через ${Math.round(hoursLeft)} ч.`,
            adId: ad._id,
            createdAt: now,
            priority: 2,
          });
        }
      }

      const views = ad.analytics?.views || 0;
      const daysSinceCreated = (now.getTime() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated >= 1 && views === 0) {
        notifications.push({
          type: 'no_views',
          icon: '👁️',
          title: 'Нет просмотров',
          message: `"${ad.title}" никто не смотрел за 24 часа`,
          adId: ad._id,
          createdAt: now,
          priority: 1,
        });
      }
    }

    notifications.sort((a, b) => b.priority - a.priority);

    res.json({
      success: true,
      data: {
        notifications: notifications.slice(0, parseInt(limit)),
        total: notifications.length,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения уведомлений' 
    });
  }
});

router.get('/price-recommendation', async (req, res) => {
  try {
    const { subcategoryId, price, lat, lng, radiusKm = 10 } = req.query;

    if (!subcategoryId || !price) {
      return res.status(400).json({
        success: false,
        error: 'subcategoryId и price обязательны',
      });
    }

    const matchStage = {
      subcategoryId,
      isFarmerAd: true,
      status: 'active',
    };

    let marketStats;
    if (lat && lng) {
      marketStats = await Ad.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)],
            },
            distanceField: 'distance',
            maxDistance: parseFloat(radiusKm) * 1000,
            spherical: true,
            key: 'location.geo',
            query: matchStage,
          },
        },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            count: { $sum: 1 },
          },
        },
      ]);
    } else {
      marketStats = await Ad.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            avgPrice: { $avg: '$price' },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            count: { $sum: 1 },
          },
        },
      ]);
    }

    const stats = marketStats[0] || { avgPrice: 0, minPrice: 0, maxPrice: 0, count: 0 };
    const userPrice = parseFloat(price);
    const diff = stats.avgPrice > 0 ? ((userPrice - stats.avgPrice) / stats.avgPrice) * 100 : 0;

    let recommendation = '';
    let status = 'market';

    if (diff < -15) {
      recommendation = 'Отличная цена! Ниже рынка — быстрые продажи гарантированы';
      status = 'below';
    } else if (diff < -5) {
      recommendation = 'Хорошая цена, немного ниже среднего';
      status = 'below';
    } else if (diff <= 5) {
      recommendation = 'Цена в рынке — конкурентоспособная';
      status = 'market';
    } else if (diff <= 15) {
      recommendation = 'Цена немного выше среднего. Рекомендуем снизить на 5-10%';
      status = 'above';
    } else {
      recommendation = `Цена значительно выше рынка (+${Math.round(diff)}%). Рекомендуем снизить`;
      status = 'above';
    }

    res.json({
      success: true,
      data: {
        userPrice,
        marketAvgPrice: Math.round(stats.avgPrice * 100) / 100,
        marketMinPrice: stats.minPrice,
        marketMaxPrice: stats.maxPrice,
        competitorsCount: stats.count,
        diffPercent: Math.round(diff * 10) / 10,
        status,
        recommendation,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error in price recommendation:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Ошибка получения рекомендации' 
    });
  }
});

router.get('/season-events', async (req, res) => {
  try {
    const now = new Date();
    
    const seasonalEvents = [
      {
        id: 'valentines',
        slug: 'valentines',
        name: '14 февраля',
        emoji: '💐',
        description: 'Тюльпаны, розы, подарки',
        startDate: new Date(now.getFullYear(), 1, 1),
        endDate: new Date(now.getFullYear(), 1, 14),
        categories: ['tulips', 'flowers', 'gifts'],
        color: '#FF6B9D',
        bannerGradient: 'linear-gradient(135deg, #FF6B9D 0%, #FF4F81 100%)',
      },
      {
        id: 'march8',
        slug: 'march8',
        name: '8 марта',
        emoji: '🌷',
        description: 'Тюльпаны, мимозы, подарки для женщин',
        startDate: new Date(now.getFullYear(), 2, 1),
        endDate: new Date(now.getFullYear(), 2, 8),
        categories: ['tulips', 'flowers', 'gifts'],
        color: '#FF9F43',
        bannerGradient: 'linear-gradient(135deg, #FF9F43 0%, #FF7675 100%)',
      },
      {
        id: 'easter',
        slug: 'easter',
        name: 'Пасха',
        emoji: '🧁',
        description: 'Куличи, выпечка, яйца',
        startDate: new Date(now.getFullYear(), 3, 1),
        endDate: new Date(now.getFullYear(), 4, 15),
        categories: ['pastry', 'eggs', 'dairy'],
        color: '#FFEAA7',
        bannerGradient: 'linear-gradient(135deg, #FFEAA7 0%, #FDCB6E 100%)',
      },
      {
        id: 'berries',
        slug: 'berries',
        name: 'Сезон ягод',
        emoji: '🍓',
        description: 'Свежие ягоды: клубника, малина, черешня',
        startDate: new Date(now.getFullYear(), 5, 1),
        endDate: new Date(now.getFullYear(), 7, 31),
        categories: ['berries', 'fruits'],
        color: '#E74C3C',
        bannerGradient: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
      },
      {
        id: 'harvest',
        slug: 'harvest',
        name: 'Урожай',
        emoji: '🥔',
        description: 'Картофель, овощи, яблоки',
        startDate: new Date(now.getFullYear(), 8, 1),
        endDate: new Date(now.getFullYear(), 10, 30),
        categories: ['vegetables', 'potato', 'fruits'],
        color: '#27AE60',
        bannerGradient: 'linear-gradient(135deg, #27AE60 0%, #1ABC9C 100%)',
      },
      {
        id: 'newyear',
        slug: 'newyear',
        name: 'Новый год',
        emoji: '🎄',
        description: 'Праздничная выпечка, консервация, подарки',
        startDate: new Date(now.getFullYear(), 11, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
        categories: ['pastry', 'preserves', 'gifts', 'honey'],
        color: '#8E44AD',
        bannerGradient: 'linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%)',
      },
    ];

    const events = seasonalEvents.map(event => {
      const isActive = now >= event.startDate && now <= event.endDate;
      const daysUntilStart = Math.ceil((event.startDate - now) / (1000 * 60 * 60 * 24));
      const daysUntilEnd = Math.ceil((event.endDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        ...event,
        isActive,
        status: isActive ? 'active' : daysUntilStart > 0 ? 'upcoming' : 'ended',
        daysUntilStart: daysUntilStart > 0 ? daysUntilStart : null,
        daysRemaining: isActive ? daysUntilEnd : null,
      };
    });

    const activeEvents = events.filter(e => e.status === 'active');
    const upcomingEvents = events.filter(e => e.status === 'upcoming').sort((a, b) => a.daysUntilStart - b.daysUntilStart);

    res.json({
      success: true,
      data: {
        active: activeEvents,
        upcoming: upcomingEvents.slice(0, 3),
        all: events,
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting season events:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get season events' 
    });
  }
});

router.get('/season-events/:slug/ads', async (req, res) => {
  try {
    const { slug } = req.params;
    const { lat, lng, radiusKm = 50, limit = 20, page = 1 } = req.query;

    const categoryMapping = {
      valentines: ['tulips', 'flowers'],
      march8: ['tulips', 'flowers'],
      easter: ['pastry', 'eggs', 'dairy'],
      berries: ['berries', 'fruits'],
      harvest: ['vegetables', 'potato', 'fruits'],
      newyear: ['pastry', 'preserves', 'honey'],
    };

    const categorySlugs = categoryMapping[slug] || [];
    
    if (categorySlugs.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Season event not found',
      });
    }

    const categories = await Category.find({ slug: { $in: categorySlugs } });
    const categoryIds = categories.map(c => c._id);

    const query = {
      status: 'active',
      isFarmerAd: true,
      categoryId: { $in: categoryIds },
    };

    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radiusNum = parseFloat(radiusKm) * 1000;

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        query.geo = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lngNum, latNum],
            },
            $maxDistance: radiusNum,
          },
        };
      }
    }

    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const pageNum = parseInt(page) || 1;
    const skip = (pageNum - 1) * limitNum;

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .sort({ boostedAt: -1, isPremiumCard: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('categoryId', 'name slug icon'),
      Ad.countDocuments({ ...query, geo: undefined }),
    ]);

    res.json({
      success: true,
      data: {
        ads,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('[FarmerAPI] Error getting season event ads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get season event ads' 
    });
  }
});

export default router;
