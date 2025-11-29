import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCategories } from '@/api/categories';
import CategoryGrid from '@/components/CategoryGrid';
import CategoryBreadcrumb from '@/components/CategoryBreadcrumb';
import ScreenLayout from '@/components/layout/ScreenLayout';
import { CategoryNode } from '@/types';
import FeedPage from './FeedPage';
import { Home } from 'lucide-react';

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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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

  const headerContent = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        background: '#FFFFFF',
        borderBottom: '1px solid #cbd5e1',
      }}
    >
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#3B73FC',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(59, 115, 252, 0.25)',
          transition: 'all 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 115, 252, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 115, 252, 0.25)';
        }}
        data-testid="button-home"
      >
        <Home size={18} />
        <span>Главная</span>
      </button>
      {slug && tree.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <CategoryBreadcrumb categorySlug={slug} categories={tree} />
        </div>
      )}
    </div>
  );

  return (
    <ScreenLayout header={headerContent} showBottomNav={true}>
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100%' }}>
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
    </ScreenLayout>
  );
}
