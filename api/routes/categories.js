import { Router } from 'express';
import Category from '../../models/Category.js';
import asyncHandler from '../middleware/asyncHandler.js';
import categoryMatchingService from '../services/categoryMatching.js';
import CategorySuggestService from '../../services/CategorySuggestService.js';
import CategoryDynamicVisibilityService from '../../services/CategoryDynamicVisibilityService.js';

const router = Router();

// In-memory cache
let cachedTree = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

function buildTree(categories) {
  const map = new Map();
  categories.forEach((cat) => {
    map.set(cat.slug, { ...cat.toObject(), subcategories: [] });
  });

  const roots = [];

  map.forEach((category) => {
    if (category.parentSlug) {
      const parent = map.get(category.parentSlug);
      if (parent) {
        parent.subcategories.push(category);
      }
    } else {
      roots.push(category);
    }
  });

  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortRecursive(n.subcategories));
  };

  sortRecursive(roots);

  const stripInternal = (node) => ({
    slug: node.slug,
    name: node.name,
    icon: node.icon,
    icon3d: node.icon3d,
    level: node.level,
    isLeaf: node.isLeaf,
    description: node.description,
    parentSlug: node.parentSlug,
    subcategories: node.subcategories.map(stripInternal),
  });

  return roots.map(stripInternal);
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = Date.now();
    
    // Используем кеш, если он свежий
    if (cachedTree && (now - cacheTimestamp) < CACHE_DURATION) {
      res.set('Cache-Control', 'public, max-age=300'); // 5 минут на клиенте
      res.set('X-Cache', 'HIT');
      return res.json(cachedTree);
    }
    
    // Загружаем из БД и обновляем кеш
    const categories = await Category.find().sort({ sortOrder: 1, slug: 1 });
    const tree = buildTree(categories);
    
    cachedTree = tree;
    cacheTimestamp = now;
    
    res.set('Cache-Control', 'public, max-age=300'); // 5 минут на клиенте
    res.set('X-Cache', 'MISS');
    res.json(tree);
  })
);

// POST endpoint для автоподбора категории по заголовку/описанию
router.post(
  '/suggest',
  asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.json({ bestMatch: null, alternatives: [] });
    }

    try {
      const result = await CategorySuggestService.suggest(title, description || '');
      res.json(result);
    } catch (error) {
      console.error('Category suggest error:', error);
      res.status(500).json({ 
        error: 'Failed to suggest category',
        bestMatch: null, 
        alternatives: [] 
      });
    }
  })
);

// GET endpoint для умного подбора категорий (legacy)
router.get(
  '/suggest',
  asyncHandler(async (req, res) => {
    const { query } = req.query;

    // Валидация
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(422).json({ 
        ok: false, 
        error: 'Query parameter is required and must be non-empty string' 
      });
    }

    if (query.length > 200) {
      return res.status(422).json({
        ok: false,
        error: 'Query too long (max 200 characters)'
      });
    }

    try {
      const matches = await categoryMatchingService.scoreCandidates(query);

      // Обогащаем результаты полными путями и top-level родителями
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const displayPath = await categoryMatchingService.buildCategoryPath(match.category.slug);
          const topLevelParentSlug = await categoryMatchingService.findTopLevelParent(match.category.slug);
          const directSubcategorySlug = await categoryMatchingService.findDirectSubcategory(match.category.slug);
          
          return {
            slug: match.category.slug,
            name: match.category.name,
            icon3d: match.category.icon3d,
            level: match.category.level,
            isLeaf: match.category.isLeaf,
            parentSlug: match.category.parentSlug,
            topLevelParentSlug,
            directSubcategorySlug,
            score: match.score,
            matchType: match.matchType,
            disambiguationReason: match.reason,
            displayPath: displayPath.join(' → ')
          };
        })
      );

      res.set('Cache-Control', 'public, max-age=300'); // 5 минут на клиенте
      res.json({
        ok: true,
        query,
        matches: enrichedMatches,
        count: enrichedMatches.length
      });
    } catch (error) {
      console.error('Category suggestion error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to suggest categories'
      });
    }
  })
);

router.get(
  '/visible',
  asyncHandler(async (req, res) => {
    const { lat, lng, radiusKm = '3', scope = 'local', categorySlug } = req.query;

    const coords =
      lat && lng
        ? {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          }
        : null;

    const radius = Math.min(Math.max(parseFloat(radiusKm) || 3, 0.1), 200);
    const scopeType = scope === 'country' ? 'country' : 'local';

    try {
      if (categorySlug) {
        const result = await CategoryDynamicVisibilityService.getVisibleSubcategories(
          categorySlug,
          coords,
          radius,
          scopeType
        );

        res.set('Cache-Control', 'public, max-age=60');
        return res.json({
          ok: true,
          ...result,
        });
      }

      const tree = await CategoryDynamicVisibilityService.getVisibleCategoryTree(
        coords,
        radius,
        scopeType
      );

      res.set('Cache-Control', 'public, max-age=60');
      res.json({
        ok: true,
        ...tree,
      });
    } catch (error) {
      console.error('Visible categories error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to fetch visible categories',
      });
    }
  })
);

router.get(
  '/:slug/visibility',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { lat, lng, radiusKm = '3' } = req.query;

    const coords =
      lat && lng
        ? {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
          }
        : null;

    const radius = Math.min(Math.max(parseFloat(radiusKm) || 3, 0.1), 200);

    try {
      const result = await CategoryDynamicVisibilityService.shouldShowSubcategory(
        slug,
        coords,
        radius
      );

      res.json({
        ok: true,
        slug,
        ...result,
      });
    } catch (error) {
      console.error('Category visibility check error:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to check category visibility',
      });
    }
  })
);

export default router;
