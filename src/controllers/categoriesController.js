import Category from '../models/Category.js';

function sortTree(nodes) {
  nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  nodes.forEach((node) => sortTree(node.subcategories));
}

function stripSortOrder(node) {
  const { sortOrder, subcategories, ...rest } = node;
  return {
    ...rest,
    subcategories: subcategories.map(stripSortOrder),
  };
}

export async function listCategories(_req, res) {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  const nodesBySlug = new Map();

  categories.forEach((category) => {
    nodesBySlug.set(category.slug, {
      slug: category.slug,
      name: category.name,
      parentSlug: category.parentSlug ?? null,
      subcategories: [],
      sortOrder: category.sortOrder ?? 0,
    });
  });

  const roots = [];

  categories.forEach((category) => {
    const node = nodesBySlug.get(category.slug);
    if (category.parentSlug) {
      const parent = nodesBySlug.get(category.parentSlug);
      if (parent) {
        parent.subcategories.push(node);
        return;
      }
    }
    roots.push(node);
  });

  sortTree(roots);

  res.json(roots.map(stripSortOrder));
}
