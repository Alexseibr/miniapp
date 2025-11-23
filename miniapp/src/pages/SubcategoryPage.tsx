import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CategoryGrid from '@/components/CategoryGrid';
import EmptyState from '@/widgets/EmptyState';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { CATEGORY_ICONS } from '@/constants/categoryIcons';

export default function SubcategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { categories, loading, loadCategories, getCategoryBySlug } = useCategoriesStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
            marginBottom: '16px',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={20} />
          Назад
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {iconPath && (
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#F5F7FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              data-testid="category-icon-header"
            >
              <img
                src={iconPath}
                alt={category.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }} data-testid="text-category-name">
              {category.name}
            </h2>
            {category.description && (
              <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6B7280' }} data-testid="text-category-description">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ paddingTop: '16px' }}>
        {subcategories.length > 0 ? (
          <CategoryGrid categories={subcategories} />
        ) : (
          <EmptyState title="Подкатегории отсутствуют" description="В этой категории нет подкатегорий" />
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
        <div
          style={{
            backgroundColor: '#4F46E5',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          data-testid="badge-subcategory-count"
        >
          {subcategories.length} {subcategories.length === 1 ? 'категория' : 'категорий'}
        </div>
      </div>
    </div>
  );
}
