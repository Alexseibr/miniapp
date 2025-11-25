import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import CategoryWordStats from '../models/CategoryWordStats.js';
import { haversineDistanceKm } from '../utils/haversine.js';

const EARTH_RADIUS_KM = 6371;

class SmartSearchService {
  async search({ query, lat, lng, radiusKm = 10, limit = 50, sort = 'distance' }) {
    const coords = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const radius = Math.min(Math.max(parseFloat(radiusKm) || 10, 0.1), 200);

    const searchTerms = this.tokenize(query);

    let matchStage = {
      status: 'active',
      moderationStatus: 'approved',
    };

    if (query && query.trim()) {
      matchStage.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { keywordTokens: { $in: searchTerms } },
      ];
    }

    if (coords) {
      matchStage.location = {
        $geoWithin: {
          $centerSphere: [[coords.lng, coords.lat], radius / EARTH_RADIUS_KM],
        },
      };
    }

    const ads = await Ad.find(matchStage).limit(500).lean();

    let results = ads.map((ad) => {
      let distanceKm = null;
      if (coords && ad.location && ad.location.lat && ad.location.lng) {
        distanceKm = haversineDistanceKm(
          coords.lat,
          coords.lng,
          Number(ad.location.lat),
          Number(ad.location.lng)
        );
      }

      const relevanceScore = this.calculateRelevance(ad, query, searchTerms);

      return {
        ...ad,
        distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
        relevanceScore,
      };
    });

    results = this.sortResults(results, sort, !!coords);

    return {
      items: results.slice(0, limit),
      total: results.length,
      query,
      radiusKm: radius,
      coords,
    };
  }

  async getSuggestions(query, limit = 10) {
    if (!query || query.trim().length < 2) {
      return { categories: [], brands: [], recentSearches: [] };
    }

    const searchTerms = this.tokenize(query);
    const regex = new RegExp(query, 'i');

    const categorySuggestions = await this.suggestCategories(regex, searchTerms, 5);

    const brandSuggestions = await this.suggestBrands(regex, 5);

    const keywordSuggestions = await this.suggestKeywords(searchTerms, 5);

    return {
      categories: categorySuggestions,
      brands: brandSuggestions,
      keywords: keywordSuggestions,
    };
  }

  async suggestCategories(regex, tokens, limit) {
    const categories = await Category.find({
      isActive: true,
      $or: [{ name: regex }, { keywordTokens: { $in: tokens } }],
    })
      .sort({ level: 1, sortOrder: 1 })
      .limit(limit * 2)
      .lean();

    const enriched = await Promise.all(
      categories.map(async (cat) => {
        let path = [cat.name];
        let current = cat;

        while (current.parentSlug) {
          const parent = await Category.findOne({ slug: current.parentSlug }).lean();
          if (parent) {
            path.unshift(parent.name);
            current = parent;
          } else {
            break;
          }
        }

        return {
          slug: cat.slug,
          name: cat.name,
          icon3d: cat.icon3d,
          level: cat.level,
          parentSlug: cat.parentSlug,
          isLeaf: cat.isLeaf,
          displayPath: path.join(' > '),
          isFarmerCategory: cat.isFarmerCategory,
        };
      })
    );

    return enriched.slice(0, limit);
  }

  async suggestBrands(regex, limit) {
    const brandsAgg = await Ad.aggregate([
      {
        $match: {
          status: 'active',
          'attributes.brand': { $exists: true, $regex: regex },
        },
      },
      {
        $group: {
          _id: '$attributes.brand',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return brandsAgg.map((b) => ({
      brand: b._id,
      count: b.count,
    }));
  }

  async suggestKeywords(tokens, limit) {
    if (!tokens || tokens.length === 0) return [];

    const stats = await CategoryWordStats.find({
      word: { $in: tokens },
    })
      .sort({ count: -1 })
      .limit(limit * 2)
      .lean();

    const uniqueWords = [...new Set(stats.map((s) => s.word))].slice(0, limit);

    return uniqueWords.map((word) => {
      const stat = stats.find((s) => s.word === word);
      return {
        keyword: word,
        categorySlug: stat?.categorySlug,
        count: stat?.count || 0,
      };
    });
  }

  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2);
  }

  calculateRelevance(ad, query, tokens) {
    let score = 0;

    if (!query) return score;

    const titleLower = (ad.title || '').toLowerCase();
    const descLower = (ad.description || '').toLowerCase();
    const queryLower = query.toLowerCase();

    if (titleLower.includes(queryLower)) {
      score += 100;
    }
    if (descLower.includes(queryLower)) {
      score += 50;
    }

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 20;
      if (descLower.includes(token)) score += 10;
      if (ad.keywordTokens && ad.keywordTokens.includes(token)) score += 15;
    }

    if (ad.photos && ad.photos.length > 0) score += 5;
    if (ad.views) score += Math.min(ad.views / 10, 20);

    return score;
  }

  sortResults(results, sortKey, hasGeo) {
    const sorted = [...results];

    switch (sortKey) {
      case 'distance':
        if (hasGeo) {
          return sorted.sort((a, b) => {
            if (a.distanceKm == null && b.distanceKm == null) return b.relevanceScore - a.relevanceScore;
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            if (a.distanceKm === b.distanceKm) return b.relevanceScore - a.relevanceScore;
            return a.distanceKm - b.distanceKm;
          });
        }
        return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);

      case 'relevance':
        return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);

      case 'price_asc':
        return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

      case 'price_desc':
        return sorted.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));

      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      case 'popular':
        return sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

      default:
        if (hasGeo) {
          return sorted.sort((a, b) => {
            if (a.distanceKm == null && b.distanceKm == null) return b.relevanceScore - a.relevanceScore;
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
          });
        }
        return sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
  }
}

export default new SmartSearchService();
