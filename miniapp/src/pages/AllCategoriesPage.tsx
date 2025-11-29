import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import CategoryGrid from '@/components/CategoryGrid';

export default function AllCategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading, loadCategories } = useCategoriesStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return (
    <div style={{ paddingBottom: 100, background: '#F8FAFC', minHeight: '100vh' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#F3F4F6',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          data-testid="button-back"
        >
          <ArrowLeft size={22} color="#374151" />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>
          Все категории
        </h1>
      </header>

      <div style={{ padding: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Loader2 size={40} color="#3B73FC" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: 16, color: '#6B7280', marginTop: 16 }}>Загружаем категории...</p>
          </div>
        ) : categories.length > 0 ? (
          <CategoryGrid categories={categories} priorityCount={6} />
        ) : (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 16, color: '#6B7280' }}>Категории не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}
