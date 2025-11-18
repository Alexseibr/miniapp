const { Router } = require('express');
const Category = require('../../models/Category.js');

const router = Router();

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
    parentSlug: node.parentSlug,
    subcategories: node.subcategories.map(stripInternal),
  });

  return roots.map(stripInternal);
}

router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, slug: 1 });
    const tree = buildTree(categories);
    res.json(tree);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
