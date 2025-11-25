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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: 12 
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: 120,
                borderRadius: 20,
                background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }}>
      <h2 style={{ 
        margin: '0 0 16px', 
        fontSize: 22, 
        fontWeight: 700, 
        color: '#111827',
        letterSpacing: '-0.3px',
      }}>
        Категории
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 12,
      }}>
        {categories.map((cat) => {
          const isSelected = selectedGroupSlug === cat.slug;
          
          return (
            <button
              key={cat.slug}
              onClick={() => onSelect(isSelected ? null : cat.slug)}
              style={{
                padding: 0,
                background: isSelected 
                  ? 'linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)' 
                  : 'linear-gradient(135deg, #FFFFFF 0%, #FAFBFC 100%)',
                border: isSelected ? '2px solid #3B73FC' : '1px solid #E5E7EB',
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                overflow: 'hidden',
                boxShadow: isSelected 
                  ? '0 4px 12px rgba(59, 115, 252, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative',
              }}
              data-testid={`category-${cat.slug}`}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '14px 14px 12px',
                gap: 8,
              }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: isSelected ? 'rgba(59, 115, 252, 0.1)' : '#F5F7FA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                }}>
                  {cat.icon3d ? (
                    <img
                      src={cat.icon3d}
                      alt={cat.name}
                      style={{
                        width: 40,
                        height: 40,
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: '#E5E7EB',
                    }} />
                  )}
                </div>
                
                <div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: isSelected ? '#3B73FC' : '#111827',
                    lineHeight: 1.25,
                    marginBottom: 2,
                  }}>
                    {cat.name}
                  </div>
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div style={{ 
                      fontSize: 12, 
                      color: '#9CA3AF',
                      fontWeight: 500,
                    }}>
                      {cat.subcategories.length} подкатег.
                    </div>
                  )}
                </div>
              </div>
              
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#3B73FC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
              padding: '14px',
              background: 'transparent',
              border: '1px solid #E5E7EB',
              borderRadius: 14,
              fontSize: 15,
              color: '#6B7280',
              cursor: 'pointer',
              minHeight: 48,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            data-testid="button-clear-group"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M4 12L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Сбросить выбор
          </button>
        </div>
      )}
    </div>
  );
}
