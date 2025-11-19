import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCategories } from '@/api/categories';
import CategoryGrid from '@/components/CategoryGrid';
import { CategoryNode } from '@/types';
import FeedPage from './FeedPage';

export default function CategoryPage() {
  const { slug } = useParams();
  const [tree, setTree] = useState<CategoryNode[]>([]);

  useEffect(() => {
    fetchCategories().then(setTree);
  }, []);

  const category = useMemo(() => tree.find((node) => node.slug === slug), [tree, slug]);

  if (!category) {
    return <FeedPage />;
  }

  return (
    <div className="container">
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{category.name}</h2>
        <p style={{ color: '#475467' }}>{category.description || 'Объявления этой категории'}</p>
      </section>
      {category.subcategories && category.subcategories.length > 0 && (
        <CategoryGrid categories={category.subcategories} />
      )}
    </div>
  );
}
