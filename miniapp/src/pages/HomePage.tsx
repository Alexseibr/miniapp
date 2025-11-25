import { useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import CategoryGrid from '@/components/CategoryGrid';
import EmptyState from '@/widgets/EmptyState';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';

export default function HomePage() {
  const { categories, loading, loadCategories } = useCategoriesStore();
  const navigate = useNavigate();
  const { requestLocation, status: geoStatus } = useGeo(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const showContent = categories.length > 0;

  const handleNearbyClick = async () => {
    await requestLocation();
    navigate('/feed?sort=distance');
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header />
      
      {/* Кнопка "Рядом со мной" */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={handleNearbyClick}
          disabled={geoStatus === 'loading'}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#3B73FC',
            color: '#ffffff',
            border: 'none',
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: geoStatus === 'loading' ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(59, 115, 252, 0.25)',
            transition: 'all 0.2s',
            opacity: geoStatus === 'loading' ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (geoStatus !== 'loading') {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 115, 252, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (geoStatus !== 'loading') {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 115, 252, 0.25)';
            }
          }}
          data-testid="button-nearby"
        >
          <MapPin size={20} />
          <span>{geoStatus === 'loading' ? 'Получаем геолокацию...' : 'Рядом со мной'}</span>
        </button>
        <p 
          style={{ 
            textAlign: 'center', 
            fontSize: '0.75rem', 
            color: '#6b7280', 
            marginTop: '8px',
            marginBottom: 0
          }}
          data-testid="text-nearby-subtitle"
        >
          Показать объявления в радиусе 5 км
        </p>
      </div>
      
      <div style={{ paddingTop: '16px' }}>
        {showContent && <CategoryGrid categories={categories} />}
        
        {loading && !showContent && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <Loader2 size={48} color="#4F46E5" style={{ animation: 'spin 1s linear infinite' }} data-testid="icon-loading" />
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Загружаем категории</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>Подождите несколько секунд</p>
          </div>
        )}
        
        {!loading && !showContent && (
          <EmptyState title="Категории не найдены" description="Попробуйте обновить страницу" />
        )}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
          zIndex: 50,
        }}
        data-testid="bottom-bar"
      >
        <div style={{ display: 'flex', flexDirection: 'column' }} data-testid="bottom-bar-branding">
          <span style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '2px' }} data-testid="text-marketplace-label">
            Маркетплейс
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }} data-testid="text-brand-name">
            KETMAR Market
          </span>
        </div>
        {showContent && (
          <div
            style={{
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
            data-testid="badge-category-count"
          >
            {categories.length} категорий
          </div>
        )}
      </div>
    </div>
  );
}
