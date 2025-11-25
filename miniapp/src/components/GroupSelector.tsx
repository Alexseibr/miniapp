import { useNavigate } from 'react-router-dom';
import { CategoryNode } from '@/types';

interface GroupSelectorProps {
  categories: CategoryNode[];
  selectedGroupSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  loading?: boolean;
}

export default function GroupSelector({ categories, selectedGroupSlug, onSelect, loading = false }: GroupSelectorProps) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 10 
        }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                borderRadius: 18,
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
    <div style={{ padding: '16px' }}>
      <h2 style={{ 
        margin: '0 0 14px', 
        fontSize: 20, 
        fontWeight: 700, 
        color: '#1C1C1E',
        letterSpacing: '-0.4px',
      }}>
        Категории
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 10,
      }}>
        {categories.map((cat) => {
          const isSelected = selectedGroupSlug === cat.slug;
          const subcategoryCount = cat.subcategories?.length || 0;
          
          const handleClick = () => {
            if (subcategoryCount > 0) {
              navigate(`/category/${cat.slug}`);
            } else if (onSelect) {
              onSelect(isSelected ? null : cat.slug);
            }
          };
          
          return (
            <button
              key={cat.slug}
              onClick={handleClick}
              style={{
                padding: 0,
                background: isSelected 
                  ? 'linear-gradient(145deg, #EBF3FF 0%, #D4E5FF 100%)' 
                  : '#FFFFFF',
                border: 'none',
                borderRadius: 18,
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'center',
                overflow: 'visible',
                boxShadow: isSelected 
                  ? '0 4px 16px rgba(59, 115, 252, 0.25), 0 2px 4px rgba(59, 115, 252, 0.1)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                aspectRatio: '1',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
              data-testid={`category-${cat.slug}`}
            >
              {subcategoryCount > 0 && (
                <div style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  background: '#2A82F0',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                  boxShadow: '0 2px 6px rgba(42, 130, 240, 0.4)',
                  zIndex: 10,
                }}>
                  {subcategoryCount}
                </div>
              )}
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 8px 10px',
                height: '100%',
                gap: 6,
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(59, 115, 252, 0.15) 0%, rgba(59, 115, 252, 0.08) 100%)' 
                    : 'linear-gradient(135deg, #F8F9FA 0%, #F0F2F5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}>
                  {cat.icon3d ? (
                    <img
                      src={cat.icon3d}
                      alt={cat.name}
                      loading="lazy"
                      decoding="async"
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #E5E7EB 0%, #D1D5DB 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                    }}>
                      📦
                    </div>
                  )}
                </div>
                
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isSelected ? '#2A82F0' : '#1C1C1E',
                  lineHeight: 1.2,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: '100%',
                  padding: '0 2px',
                }}>
                  {cat.name}
                </div>
              </div>
              
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  bottom: 6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 20,
                  height: 3,
                  borderRadius: 2,
                  background: '#2A82F0',
                }} />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
