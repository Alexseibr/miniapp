import { CategoryNode } from '@/types';

interface GroupSelectorProps {
  categories: CategoryNode[];
  selectedGroupSlug: string | null;
  onSelect: (slug: string | null) => void;
  loading?: boolean;
}

export default function GroupSelector({ categories, selectedGroupSlug, onSelect, loading = false }: GroupSelectorProps) {
  if (loading) {
    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          Загрузка категорий...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 600, color: '#111827' }}>
        Что вы ищете?
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {categories.map((cat) => {
          const isSelected = selectedGroupSlug === cat.slug;
          
          return (
            <button
              key={cat.slug}
              onClick={() => onSelect(isSelected ? null : cat.slug)}
              style={{
                padding: '16px 12px',
                background: isSelected ? '#EBF3FF' : '#FFFFFF',
                border: isSelected ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                borderRadius: 16,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                minHeight: 100,
              }}
              data-testid={`category-${cat.slug}`}
            >
              {cat.icon3d && (
                <img
                  src={cat.icon3d}
                  alt={cat.name}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'contain',
                  }}
                />
              )}
              <div style={{
                fontSize: 16,
                fontWeight: isSelected ? 600 : 500,
                color: isSelected ? '#3B73FC' : '#111827',
                lineHeight: 1.3,
              }}>
                {cat.name}
              </div>
              {cat.subcategories && cat.subcategories.length > 0 && (
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {cat.subcategories.length} категорий
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedGroupSlug && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => onSelect(null)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              fontSize: 15,
              color: '#6B7280',
              cursor: 'pointer',
            }}
            data-testid="button-clear-group"
          >
            ✕ Очистить выбор
          </button>
        </div>
      )}
    </div>
  );
}
