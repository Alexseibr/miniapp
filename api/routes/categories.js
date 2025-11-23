import { Router } from 'express';
import Category from '../../models/Category.js';
import asyncHandler from '../middleware/asyncHandler.js';

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

export default router;
