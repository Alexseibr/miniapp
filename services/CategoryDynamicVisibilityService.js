import Category from '../models/Category.js';
import Ad from '../models/Ad.js';

const DEFAULT_MIN_COUNT_LOCAL = 5;
const DEFAULT_MIN_COUNT_COUNTRY = 10;
const EARTH_RADIUS_KM = 6371;

class CategoryDynamicVisibilityService {
  async getVisibleSubcategories(categorySlug, coords, radiusKm = 3, scope = 'local') {
    const parentCategory = await Category.findOne({ slug: categorySlug, isActive: true });
    if (!parentCategory) {
      return { category: null, subcategories: [] };
    }

    const subcategories = await Category.find({
      parentSlug: categorySlug,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    if (subcategories.length === 0) {
      return {
        category: this.formatCategory(parentCategory),
        subcategories: [],
      };
    }

    const subcategorySlugs = subcategories.map((s) => s.slug);

    let adCounts;
    if (scope === 'country' || !coords) {
      adCounts = await this.countAdsCountry(subcategorySlugs);
    } else {
      adCounts = await this.countAdsLocal(subcategorySlugs, coords, radiusKm);
    }

    const enrichedSubcategories = subcategories.map((sub) => {
      const count = adCounts[sub.slug] || 0;
      const minCount =
        scope === 'country'
          ? sub.dynamicMinCountCountry || DEFAULT_MIN_COUNT_COUNTRY
          : sub.dynamicMinCountLocal || DEFAULT_MIN_COUNT_LOCAL;

      const visible = !sub.isDynamic || count >= minCount || sub.isOther;

      return {
        ...this.formatCategory(sub),
        count,
        visible,
        isDynamic: sub.isDynamic,
        minCount,
      };
    });

    if (scope === 'country') {
      enrichedSubcategories.sort((a, b) => b.count - a.count);
    }

    return {
      category: this.formatCategory(parentCategory),
      subcategories: enrichedSubcategories,
      scope,
      radiusKm: scope === 'local' ? radiusKm : null,
    };
  }

  async getVisibleCategoryTree(coords, radiusKm = 3, scope = 'local') {
    const rootCategories = await Category.find({
      level: 1,
      isActive: true,
    }).sort({ sortOrder: 1, name: 1 });

    const tree = [];

    for (const root of rootCategories) {
      const { subcategories } = await this.getVisibleSubcategories(
        root.slug,
        coords,
        radiusKm,
        scope
      );

      const visibleSubcategories = subcategories.filter((s) => s.visible);

      const rootCount = await this.countAdsForCategory(root.slug, coords, radiusKm, scope);

      tree.push({
        ...this.formatCategory(root),
        count: rootCount,
        subcategories: visibleSubcategories,
        hasHiddenSubcategories: subcategories.length > visibleSubcategories.length,
        totalSubcategories: subcategories.length,
        visibleSubcategoriesCount: visibleSubcategories.length,
      });
    }

    return {
      categories: tree,
      scope,
      radiusKm: scope === 'local' ? radiusKm : null,
      coords: coords ? { lat: coords.lat, lng: coords.lng } : null,
    };
  }

  async countAdsLocal(subcategorySlugs, coords, radiusKm) {
    if (!coords || !coords.lat || !coords.lng) {
      return this.countAdsCountry(subcategorySlugs);
    }

    const pipeline = [
      {
        $match: {
          subcategorySlug: { $in: subcategorySlugs },
          status: 'active',
          location: {
            $geoWithin: {
              $centerSphere: [[coords.lng, coords.lat], radiusKm / EARTH_RADIUS_KM],
            },
          },
        },
      },
      {
        $group: {
          _id: '$subcategorySlug',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Ad.aggregate(pipeline);

    const counts = {};
    for (const r of results) {
      counts[r._id] = r.count;
    }

    return counts;
  }

  async countAdsCountry(subcategorySlugs) {
    const pipeline = [
      {
        $match: {
          subcategorySlug: { $in: subcategorySlugs },
          status: 'active',
        },
      },
      {
        $group: {
          _id: '$subcategorySlug',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Ad.aggregate(pipeline);

    const counts = {};
    for (const r of results) {
      counts[r._id] = r.count;
    }

    return counts;
  }

  async countAdsForCategory(categorySlug, coords, radiusKm, scope) {
    const subcategories = await Category.find({
      parentSlug: categorySlug,
      isActive: true,
    }).select('slug');

    const slugs = [categorySlug, ...subcategories.map((s) => s.slug)];

    let matchStage = {
      $or: [{ categorySlug: categorySlug }, { subcategorySlug: { $in: slugs } }],
      status: 'active',
    };

    if (scope === 'local' && coords && coords.lat && coords.lng) {
      matchStage.location = {
        $geoWithin: {
          $centerSphere: [[coords.lng, coords.lat], radiusKm / EARTH_RADIUS_KM],
        },
      };
    }

    return await Ad.countDocuments(matchStage);
  }

  formatCategory(cat) {
    return {
      _id: cat._id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      icon3d: cat.icon3d,
      level: cat.level,
      parentSlug: cat.parentSlug,
      isLeaf: cat.isLeaf,
      isOther: cat.isOther,
      isFarmerCategory: cat.isFarmerCategory,
      isSeasonal: cat.isSeasonal,
      type: cat.type,
    };
  }

  async shouldShowSubcategory(subcategorySlug, coords, radiusKm = 3) {
    const subcategory = await Category.findOne({ slug: subcategorySlug, isActive: true });
    if (!subcategory) {
      return { visible: false, reason: 'not_found' };
    }

    if (!subcategory.isDynamic) {
      return { visible: true, reason: 'not_dynamic' };
    }

    if (subcategory.isOther) {
      return { visible: true, reason: 'is_other' };
    }

    const minCount = subcategory.dynamicMinCountLocal || DEFAULT_MIN_COUNT_LOCAL;

    let matchStage = {
      subcategorySlug: subcategorySlug,
      status: 'active',
    };

    if (coords && coords.lat && coords.lng) {
      matchStage.location = {
        $geoWithin: {
          $centerSphere: [[coords.lng, coords.lat], radiusKm / EARTH_RADIUS_KM],
        },
      };
    }

    const count = await Ad.countDocuments(matchStage);

    return {
      visible: count >= minCount,
      count,
      minCount,
      reason: count >= minCount ? 'has_enough_ads' : 'not_enough_ads',
    };
  }
}

export default new CategoryDynamicVisibilityService();
