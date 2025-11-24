import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CategoryBreadcrumb from '@/components/CategoryBreadcrumb';
import CategoryGrid from '@/components/CategoryGrid';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';

export default function SubcategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { categories, loading, loadCategories, getCategoryBySlug } = useCategoriesStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = useMemo(() => getCategoryBySlug(slug || ''), [slug, categories, getCategoryBySlug]);
  const subcategories = useMemo(() => category?.subcategories || [], [category]);

  const { data: adsData, isLoading: adsLoading } = useQuery<any>({
    queryKey: ['/api/ads/search', { 
      categorySlug: slug,
      limit: 50 
    }],
    enabled: !!slug && !!category,
  });

  const ads = Array.isArray(adsData)
    ? adsData
    : Array.isArray(adsData?.ads)
      ? adsData.ads
      : Array.isArray(adsData?.items)
        ? adsData.items
        : [];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#fff', minHeight: '100vh' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={48} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} data-testid="icon-loading" />
        </div>
        <h3 style={{ margin: '0 0 8px' }}>Загружаем категории</h3>
        <p style={{ color: '#6b7280', margin: 0 }}>Подождите несколько секунд</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ paddingBottom: '80px', backgroundColor: '#fff', minHeight: '100vh' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: '1rem',
              color: '#4F46E5',
              fontWeight: 500,
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} />
            Назад
          </button>
        </div>
        <EmptyState title="Категория не найдена" description="Вернитесь на главную страницу" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '80px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #cbd5e1',
          zIndex: 10,
          padding: '12px 16px',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.875rem',
            color: '#0f172a',
            fontWeight: 500,
            marginBottom: '12px',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={18} />
          Назад
        </button>
        <CategoryBreadcrumb categories={categories} categorySlug={slug || ''} />
      </div>

      {subcategories.length > 0 && (
        <div style={{ padding: '16px', backgroundColor: '#f8fafc' }}>
          <div style={{ marginBottom: '16px' }}>
            <CategoryBreadcrumb categories={categories} categorySlug={slug || ''} />
          </div>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Категории
          </h3>
          <CategoryGrid categories={subcategories} />
        </div>
      )}

      <div style={{ padding: '16px', backgroundColor: '#ffffff' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
            Все объявления
          </h3>
          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
            {ads.length} {ads.length === 1 ? 'объявление' : ads.length < 5 ? 'объявления' : 'объявлений'}
          </span>
        </div>

        {adsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        ) : ads.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ads.map((ad: any) => (
              <AdCard key={ad._id} ad={ad} />
            ))}
          </div>
        ) : (
          <EmptyState 
            title="Объявлений не найдено" 
            description="В этой категории пока нет объявлений" 
          />
        )}
      </div>
    </div>
  );
}
