import { Router } from 'express';
import Category from '../../../models/Category.js';
import { sendSuccess, handleRouteError } from '../utils/response.js';

const router = Router();

function buildCategoryTree(categories) {
  const bySlug = new Map();
  categories.forEach((cat) => bySlug.set(cat.slug, { ...cat.toObject(), children: [] }));

  const roots = [];
  bySlug.forEach((cat) => {
    if (cat.parentSlug && bySlug.has(cat.parentSlug)) {
      bySlug.get(cat.parentSlug).children.push(cat);
    } else {
      roots.push(cat);
    }
  });

  return roots.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

router.get('/', async (_req, res) => {
  try {
    const categories = await Category.find({}).sort({ sortOrder: 1, name: 1 });
    return sendSuccess(res, buildCategoryTree(categories));
  } catch (error) {
    return handleRouteError(res, error, 'CATEGORIES_FETCH_FAILED');
  }
});

router.get('/:id/subcategories', async (req, res) => {
  try {
    const categories = await Category.find({ parentSlug: req.params.id }).sort({ sortOrder: 1, name: 1 });
    return sendSuccess(res, categories);
  } catch (error) {
    return handleRouteError(res, error, 'SUBCATEGORIES_FETCH_FAILED');
  }
});

export default router;
