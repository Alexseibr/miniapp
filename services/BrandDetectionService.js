import BrandStats from '../models/BrandStats.js';
import Category from '../models/Category.js';
import brandsData from '../data/brands.json' with { type: 'json' };

const LOCAL_VISIBILITY_THRESHOLD = 7;
const COUNTRY_VISIBILITY_THRESHOLD = 15;
const HIDE_THRESHOLD = 3;

class BrandDetectionService {
  constructor() {
    this.brands = brandsData;
    this.keywordToBrand = this.buildKeywordIndex();
  }

  buildKeywordIndex() {
    const index = new Map();
    
    for (const [brandKey, brandData] of Object.entries(this.brands)) {
      for (const keyword of brandData.keywords) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!index.has(normalizedKeyword)) {
          index.set(normalizedKeyword, []);
        }
        index.get(normalizedKeyword).push({
          key: brandKey,
          name: brandData.name,
          icon: brandData.icon,
          categories: brandData.categories,
        });
      }
    }
    
    return index;
  }

  detectBrand(text, categorySlug = null) {
    if (!text) return null;

    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/[\s\-_.,!?()]+/).filter(w => w.length > 1);
    
    const detectedBrands = new Map();

    for (const word of words) {
      if (this.keywordToBrand.has(word)) {
        const matches = this.keywordToBrand.get(word);
        for (const match of matches) {
          if (!categorySlug || match.categories.some(cat => categorySlug.includes(cat))) {
            const existing = detectedBrands.get(match.key);
            if (!existing || existing.priority < 1) {
              detectedBrands.set(match.key, {
                ...match,
                priority: 1,
                matchedKeyword: word,
              });
            }
          }
        }
      }
    }

    for (const [keyword, matches] of this.keywordToBrand.entries()) {
      if (keyword.includes(' ') && normalizedText.includes(keyword)) {
        for (const match of matches) {
          if (!categorySlug || match.categories.some(cat => categorySlug.includes(cat))) {
            const existing = detectedBrands.get(match.key);
            if (!existing || existing.priority < 2) {
              detectedBrands.set(match.key, {
                ...match,
                priority: 2,
                matchedKeyword: keyword,
              });
            }
          }
        }
      }
    }

    if (detectedBrands.size === 0) return null;

    const sorted = [...detectedBrands.values()].sort((a, b) => b.priority - a.priority);
    return sorted[0];
  }

  async updateBrandStats(ad, increment = 1) {
    if (!ad || !ad.category) return null;

    const text = `${ad.title || ''} ${ad.description || ''}`;
    const detected = this.detectBrand(text, ad.categorySlug);

    if (!detected) return null;

    const cityKey = ad.citySlug || ad.city || 'unknown';

    try {
      const stats = await BrandStats.findOneAndUpdate(
        {
          brandKey: detected.key,
          categoryId: ad.category,
        },
        {
          $inc: {
            countCountry: increment,
            [`countByCity.${cityKey}`]: increment,
          },
          $set: {
            brand: detected.name,
            categorySlug: ad.categorySlug || '',
            icon: detected.icon,
            lastUpdatedAt: new Date(),
          },
          $setOnInsert: {
            brandKey: detected.key,
            categoryId: ad.category,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      await this.updateVisibility(stats);

      return {
        brandKey: detected.key,
        brandName: detected.name,
        statsId: stats._id,
      };
    } catch (error) {
      console.error('[BrandDetectionService] Error updating brand stats:', error);
      return null;
    }
  }

  async updateVisibility(stats) {
    if (!stats) return;

    const updates = {};

    if (stats.countCountry >= COUNTRY_VISIBILITY_THRESHOLD) {
      updates.isVisibleCountry = true;
    } else if (stats.countCountry < HIDE_THRESHOLD) {
      updates.isVisibleCountry = false;
    }

    let hasLocalVisibility = false;
    if (stats.countByCity) {
      for (const [, count] of stats.countByCity) {
        if (count >= LOCAL_VISIBILITY_THRESHOLD) {
          hasLocalVisibility = true;
          break;
        }
      }
    }

    updates.isVisible = hasLocalVisibility || stats.isVisibleCountry;

    if (Object.keys(updates).length > 0) {
      await BrandStats.updateOne({ _id: stats._id }, { $set: updates });
    }
  }

  async getVisibleBrands(categoryId, options = {}) {
    const { lat, lng, radiusKm, citySlug, scope = 'local' } = options;

    const query = { categoryId };

    if (scope === 'country') {
      query.isVisibleCountry = true;
    } else {
      query.$or = [
        { isVisibleCountry: true },
        { isVisible: true },
      ];
    }

    const brands = await BrandStats.find(query)
      .sort({ countCountry: -1 })
      .lean();

    if (scope === 'local' && citySlug) {
      return brands.filter(brand => {
        const cityCount = brand.countByCity?.get?.(citySlug) || brand.countByCity?.[citySlug] || 0;
        return cityCount >= HIDE_THRESHOLD || brand.isVisibleCountry;
      });
    }

    return brands;
  }

  async getVisibleBrandsBySlug(categorySlug, options = {}) {
    const category = await Category.findOne({ slug: categorySlug }).lean();
    if (!category) return [];

    return this.getVisibleBrands(category._id, options);
  }

  async recalculateBrandStats(categoryId) {
    const Ad = (await import('../models/Ad.js')).default;
    
    const ads = await Ad.find({
      category: categoryId,
      status: 'active',
    }).lean();

    const brandCounts = new Map();

    for (const ad of ads) {
      const text = `${ad.title || ''} ${ad.description || ''}`;
      const detected = this.detectBrand(text);

      if (detected) {
        const key = detected.key;
        if (!brandCounts.has(key)) {
          brandCounts.set(key, {
            brand: detected.name,
            brandKey: detected.key,
            icon: detected.icon,
            countCountry: 0,
            countByCity: {},
          });
        }

        const stats = brandCounts.get(key);
        stats.countCountry++;

        const cityKey = ad.citySlug || ad.city || 'unknown';
        stats.countByCity[cityKey] = (stats.countByCity[cityKey] || 0) + 1;
      }
    }

    const category = await Category.findById(categoryId).lean();

    for (const [brandKey, counts] of brandCounts) {
      const isVisibleCountry = counts.countCountry >= COUNTRY_VISIBILITY_THRESHOLD;
      let isVisible = isVisibleCountry;

      for (const count of Object.values(counts.countByCity)) {
        if (count >= LOCAL_VISIBILITY_THRESHOLD) {
          isVisible = true;
          break;
        }
      }

      await BrandStats.findOneAndUpdate(
        { brandKey, categoryId },
        {
          $set: {
            brand: counts.brand,
            categorySlug: category?.slug || '',
            icon: counts.icon,
            countCountry: counts.countCountry,
            countByCity: counts.countByCity,
            isVisible,
            isVisibleCountry,
            lastUpdatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    return brandCounts.size;
  }

  getBrandInfo(brandKey) {
    return this.brands[brandKey] || null;
  }

  getAllBrands() {
    return Object.entries(this.brands).map(([key, data]) => ({
      key,
      name: data.name,
      icon: data.icon,
      categories: data.categories,
    }));
  }
}

export default new BrandDetectionService();
