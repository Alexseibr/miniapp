import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CategoryBreadcrumb from '@/components/CategoryBreadcrumb';
import CategoryScroll from '@/components/CategoryScroll';
import AdCard from '@/components/AdCard';
import EmptyState from '@/widgets/EmptyState';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

export default function SubcategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, loading, loadCategories, getCategoryBySlug } = useCategoriesStore();
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    searchParams.get('subcategory')
  );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setSelectedSubcategory(searchParams.get('subcategory'));
  }, [searchParams]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={48} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} data-testid="icon-loading" />
        </div>
        <h3 style={{ margin: '0 0 8px' }}>Загружаем категории</h3>
        <p style={{ color: '#6b7280', margin: 0 }}>Подождите несколько секунд</p>
      </div>
    );
  }

  const category = getCategoryBySlug(slug || '');
  const subcategories = category?.subcategories || [];
  const iconPath = slug ? CATEGORY_ICONS[slug] : null;

  // Fetch ads for this category
  const { data: adsData, isLoading: adsLoading } = useQuery<any>({
    queryKey: ['/api/ads/search', { 
      categorySlug: slug,
      ...(selectedSubcategory && { subcategorySlug: selectedSubcategory }),
      limit: 50 
    }],
    enabled: !!slug,
  });

  const ads = Array.isArray(adsData)
    ? adsData
    : Array.isArray(adsData?.ads)
      ? adsData.ads
      : Array.isArray(adsData?.items)
        ? adsData.items
        : [];

  const handleSubcategoryClick = (subSlug: string | null) => {
    if (subSlug === selectedSubcategory) {
      // Deselect
      setSelectedSubcategory(null);
      searchParams.delete('subcategory');
    } else {
      setSelectedSubcategory(subSlug);
      if (subSlug) {
        searchParams.set('subcategory', subSlug);
      } else {
        searchParams.delete('subcategory');
      }
    }
    setSearchParams(searchParams);
  };

  if (!category) {
    return (
      <div style={{ paddingBottom: '80px' }}>
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
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
    <div style={{ paddingBottom: '80px' }}>
      {/* Header with Breadcrumb */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
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
            color: 'var(--color-primary)',
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

      {/* Subcategories Filter */}
      {subcategories.length > 0 && (
        <div style={{ padding: '12px 0', backgroundColor: 'var(--bg-secondary)' }}>
          <CategoryScroll
            categories={subcategories}
            selectedSlug={selectedSubcategory}
            onCategoryClick={handleSubcategoryClick}
          />
        </div>
      )}

      {/* Ads List */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            {selectedSubcategory 
              ? `${subcategories.find(s => s.slug === selectedSubcategory)?.name || 'Фильтр'}`
              : 'Все объявления'}
          </h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-secondary)' }}>
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
            description="Попробуйте изменить фильтры или выбрать другую категорию" 
          />
        )}
      </div>
    </div>
  );
}
