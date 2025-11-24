import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'wouter';
import { fetchCategories } from '@/api/categories';
import CategoryGrid from '@/components/CategoryGrid';
import CategoryBreadcrumb from '@/components/CategoryBreadcrumb';
import { CategoryNode } from '@/types';
import FeedPage from './FeedPage';

function flattenCategories(tree: CategoryNode[]): CategoryNode[] {
  const result: CategoryNode[] = [];
  function traverse(nodes: CategoryNode[]): void {
    for (const node of nodes) {
      result.push(node);
      if (node.subcategories && node.subcategories.length > 0) {
        traverse(node.subcategories);
      }
    }
  }
  traverse(tree);
  return result;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug;
  const [tree, setTree] = useState<CategoryNode[]>([]);

  useEffect(() => {
    fetchCategories().then(setTree);
  }, []);

  const category = useMemo(() => {
    const flat = flattenCategories(tree);
    return flat.find((node) => node.slug === slug);
  }, [tree, slug]);

  if (!category || category.isLeaf) {
    return <FeedPage />;
  }

  return (
    <div>
      {slug && tree.length > 0 && (
        <CategoryBreadcrumb categorySlug={slug} categories={tree} />
      )}
      
      <div className="container" style={{ paddingTop: 16 }}>
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{category.name}</h2>
          <p style={{ color: '#475467' }}>{category.description || 'Объявления этой категории'}</p>
        </section>
        {category.subcategories && category.subcategories.length > 0 && (
          <CategoryGrid categories={category.subcategories} />
        )}
      </div>
    </div>
  );
}
