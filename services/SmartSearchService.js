import Ad from '../models/Ad.js';
import Category from '../models/Category.js';
import CategoryWordStats from '../models/CategoryWordStats.js';
import { haversineDistanceKm } from '../utils/haversine.js';
import HotSearchService from './HotSearchService.js';

const EARTH_RADIUS_KM = 6371;
const FUZZY_THRESHOLD = 0.7;
const CATEGORY_CACHE_DURATION = 5 * 60 * 1000;

let categoryCache = null;
let categoryCacheTime = 0;

function levenshteinDistance(a, b) {
  if (!a || !b) return a?.length || b?.length || 0;
  
  const matrix = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a, b) {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

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

    if (query && query.trim().length >= 2) {
      HotSearchService.logSearch({
        query,
        lat: coords?.lat,
        lng: coords?.lng,
        resultsCount: results.length,
      }).catch(err => console.error('[SmartSearch] Log error:', err.message));
    }

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

    const categorySuggestions = await this.suggestCategories(regex, searchTerms, 5, query);

    const brandSuggestions = await this.suggestBrands(regex, 5);

    const keywordSuggestions = await this.suggestKeywords(searchTerms, 5);

    return {
      categories: categorySuggestions,
      brands: brandSuggestions,
      keywords: keywordSuggestions,
    };
  }

  async getCachedCategories() {
    const now = Date.now();
    if (categoryCache && (now - categoryCacheTime) < CATEGORY_CACHE_DURATION) {
      return categoryCache;
    }
    
    categoryCache = await Category.find({ isActive: true })
      .select('slug name icon3d level parentSlug isLeaf isFarmerCategory keywordTokens')
      .lean();
    categoryCacheTime = now;
    
    return categoryCache;
  }

  async suggestCategories(regex, tokens, limit, query = '') {
    const allCategories = await this.getCachedCategories();
    
    const categories = allCategories.filter(cat => {
      if (regex.test(cat.name)) return true;
      if (cat.keywordTokens && cat.keywordTokens.some(kw => tokens.includes(kw))) return true;
      return false;
    }).slice(0, limit * 3);

    const fuzzyCandidates = [];
    if (query && query.length >= 2) {
      for (const cat of allCategories) {
        const nameSimilarity = levenshteinSimilarity(query, cat.name);
        
        let keywordSimilarity = 0;
        if (cat.keywordTokens && cat.keywordTokens.length > 0) {
          for (const kw of cat.keywordTokens) {
            const sim = levenshteinSimilarity(query, kw);
            if (sim > keywordSimilarity) keywordSimilarity = sim;
          }
        }
        
        const maxSimilarity = Math.max(nameSimilarity, keywordSimilarity);
        
        if (maxSimilarity >= FUZZY_THRESHOLD && !categories.some(c => c.slug === cat.slug)) {
          fuzzyCandidates.push({ ...cat, fuzzySimilarity: maxSimilarity });
        }
      }
      
      fuzzyCandidates.sort((a, b) => b.fuzzySimilarity - a.fuzzySimilarity);
    }

    const combined = [
      ...categories.map(c => ({ ...c, fuzzySimilarity: 1 })),
      ...fuzzyCandidates.slice(0, limit),
    ];

    const categoryMap = new Map(allCategories.map(c => [c.slug, c]));
    
    const enriched = combined.slice(0, limit * 2).map((cat) => {
      let path = [cat.name];
      let current = cat;

      while (current.parentSlug) {
        const parent = categoryMap.get(current.parentSlug);
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
        similarity: cat.fuzzySimilarity || 1,
      };
    });

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

    const titleWords = titleLower.split(/\s+/);
    for (const titleWord of titleWords) {
      if (titleWord.length >= 3) {
        const similarity = levenshteinSimilarity(queryLower, titleWord);
        if (similarity >= FUZZY_THRESHOLD) {
          score += Math.round(similarity * 30);
        }
      }
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
