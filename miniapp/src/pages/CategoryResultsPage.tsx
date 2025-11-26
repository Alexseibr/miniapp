import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useGeo } from '@/utils/geo';
import { useNearbyAds } from '@/hooks/useNearbyAds';
import { fetchCategories } from '@/api/categories';
import { CategoryNode } from '@/types';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

const RADIUS_OPTIONS = [
  { value: 0.3, label: '300м' },
  { value: 1, label: '1 км' },
  { value: 5, label: '5 км' },
  { value: 10, label: '10 км' },
  { value: 20, label: '20 км' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'По дате' },
  { value: 'distance', label: 'По удалению' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

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

export default function CategoryResultsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { coords, radiusKm, setRadius } = useGeo();
  
  const [category, setCategory] = useState<CategoryNode | null>(null);
  const [subcategories, setSubcategories] = useState<CategoryNode[]>([]);
  const [selectedRadius, setSelectedRadius] = useState(radiusKm || 5);
  const [sortBy, setSortByState] = useState('newest');
  
  const setSortBy = (newSort: string) => {
    if (newSort === 'distance' && !coords) {
      return;
    }
    setSortByState(newSort);
  };
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  useEffect(() => {
    const loadCategory = async () => {
      const tree = await fetchCategories();
      const flat = flattenCategories(tree);
      const found = flat.find((node) => node.slug === slug);
      if (found) {
        setCategory(found);
        setSubcategories(found.subcategories || []);
      }
    };
    loadCategory();
  }, [slug]);

  useEffect(() => {
    if (radiusKm && radiusKm !== selectedRadius) {
      setSelectedRadius(radiusKm);
    }
  }, [radiusKm]);

  const prevCoordsRef = useRef(coords);
  
  useEffect(() => {
    const hasLocation = !!coords;
    
    if (!hasLocation && sortBy === 'distance') {
      setSortByState('newest');
    }
    
    prevCoordsRef.current = coords;
  }, [coords, sortBy]);

  const hasRealLocation = !!coords;
  const effectiveScope = hasRealLocation ? 'local' : 'country';
  const effectiveSort = (!hasRealLocation && sortBy === 'distance') ? 'newest' : sortBy;
  
  const availableSortOptions = hasRealLocation 
    ? SORT_OPTIONS 
    : SORT_OPTIONS.filter(o => o.value !== 'distance');
  
  const { ads, loading } = useNearbyAds({
    coords: coords,
    radiusKm: selectedRadius,
    categoryId: selectedSubcategory || slug,
    enabled: !!slug,
    limit: 50,
    sort: effectiveSort,
    scope: effectiveScope,
  });

  const totalCount = ads.length;

  const handleBack = () => {
    navigate(-1);
  };

  const handleAdClick = (adId: string) => {
    navigate(`/ads/${adId}`);
  };

  const formatDistance = (km?: number) => {
    if (km === undefined || km === null) return '';
    if (km < 0.1) return '< 100 м';
    if (km < 1) return `${Math.round(km * 100) * 10} м`;
    return `${km.toFixed(1)} км`;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'Цена не указана';
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const isNew = (createdAt?: string) => {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  const getSelectedSortLabel = () => {
    return availableSortOptions.find(o => o.value === sortBy)?.label || SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Сортировка';
  };

  return (
    <div style={{
      minHeight: '100%',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Compact Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#FFFFFF',
        zIndex: 50,
        borderBottom: '1px solid #F0F2F5',
      }}>
        {/* Title Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
        }}>
          <button
            onClick={handleBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={22} color="#1F2937" />
          </button>
          
          <h1 
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1F2937',
              margin: 0,
              flex: 1,
            }}
            data-testid="text-category-title"
          >
            {category?.name || 'Категория'}
          </h1>
        </div>

        {/* Radius Pills Row */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 16px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setSelectedRadius(option.value);
                setRadius(option.value);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: selectedRadius === option.value ? 'none' : '1px solid #E5E7EB',
                background: selectedRadius === option.value ? '#3A7BFF' : '#FFFFFF',
                color: selectedRadius === option.value ? '#FFFFFF' : '#1F2937',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              data-testid={`radius-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Filter & Sort Row */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 16px 12px',
        }}>
          <button
            onClick={() => setShowFilterSheet(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: selectedSubcategory ? '#F0F7FF' : '#F5F6F8',
              border: selectedSubcategory ? '1px solid #3A7BFF' : '1px solid #E5E7EB',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              color: selectedSubcategory ? '#3A7BFF' : '#1F2937',
              cursor: 'pointer',
            }}
            data-testid="button-filter"
          >
            <SlidersHorizontal size={16} />
            <span>Фильтр</span>
            {selectedSubcategory && (
              <span style={{
                background: '#3A7BFF',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: 18,
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
              }}>1</span>
            )}
          </button>
          
          <button
            onClick={() => setShowSortSheet(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#F5F6F8',
              border: '1px solid #E5E7EB',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              color: '#1F2937',
              cursor: 'pointer',
            }}
            data-testid="button-sort"
          >
            <span>Сортировка</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div style={{ flex: 1, padding: '12px 16px', paddingBottom: 100 }}>
        {/* Results Count */}
        <div 
          style={{
            fontSize: 14,
            color: '#6B7280',
            marginBottom: 16,
          }}
          data-testid="text-category-results-count"
        >
          Найдено {totalCount} объявлений
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 40,
          }}>
            <div style={{
              width: 32,
              height: 32,
              border: '3px solid #F0F2F5',
              borderTopColor: '#3A7BFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {/* Empty State */}
        {!loading && ads.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}>
            <div style={{
              fontSize: 48,
              marginBottom: 16,
            }}>📦</div>
            <h3 
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1F2937',
                marginBottom: 8,
              }}
              data-testid="text-empty-category"
            >
              Нет объявлений
            </h3>
            <p style={{
              fontSize: 14,
              color: '#6B7280',
            }}>
              Попробуйте увеличить радиус поиска
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!loading && ads.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {ads.map((ad) => (
              <div
                key={ad._id}
                onClick={() => handleAdClick(ad._id)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  border: '1px solid #F0F2F5',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                data-testid={`ad-card-${ad._id}`}
              >
                {/* Image */}
                <div style={{
                  position: 'relative',
                  aspectRatio: '1',
                  background: '#F5F6F8',
                }}>
                  {ad.photos && ad.photos.length > 0 ? (
                    <img
                      src={getThumbnailUrl(ad.photos[0])}
                      alt={ad.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9CA3AF',
                      fontSize: 14,
                    }}>
                      Нет фото
                    </div>
                  )}
                  
                  {isNew(ad.createdAt) && (
                    <div style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      padding: '4px 10px',
                      background: '#22C55E',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#FFFFFF',
                    }}>
                      Свежее
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: 12 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#1F2937',
                    marginBottom: 4,
                  }}>
                    {formatPrice(ad.price)}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#374151',
                    marginBottom: 6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ad.title}
                  </div>
                  {ad.distanceKm !== undefined && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: '#9CA3AF',
                    }}>
                      <span>📍</span>
                      <span>{formatDistance(ad.distanceKm)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      {showFilterSheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowFilterSheet(false)}
        >
          <div
            style={{
              width: '100%',
              background: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '16px 16px 32px',
              maxHeight: '70vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 20px',
            }} />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
              }}>
                Фильтр по подкатегориям
              </h3>
              
              {selectedSubcategory && (
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 14,
                    color: '#3A7BFF',
                    cursor: 'pointer',
                  }}
                >
                  Сбросить
                </button>
              )}
            </div>
            
            {/* All option */}
            <button
              onClick={() => {
                setSelectedSubcategory(null);
                setShowFilterSheet(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '14px 16px',
                background: !selectedSubcategory ? '#F0F7FF' : '#FFFFFF',
                border: !selectedSubcategory ? '2px solid #3A7BFF' : '1px solid #E5E7EB',
                borderRadius: 16,
                marginBottom: 8,
                textAlign: 'left',
                fontSize: 15,
                fontWeight: !selectedSubcategory ? 600 : 400,
                color: !selectedSubcategory ? '#3A7BFF' : '#1F2937',
                cursor: 'pointer',
              }}
            >
              Все подкатегории
            </button>
            
            {/* Subcategories Grid */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 12,
            }}>
              {subcategories.map((sub) => (
                <button
                  key={sub.slug}
                  onClick={() => {
                    setSelectedSubcategory(sub.slug);
                    setShowFilterSheet(false);
                  }}
                  style={{
                    padding: '10px 18px',
                    background: selectedSubcategory === sub.slug ? '#3A7BFF' : '#F5F6F8',
                    border: selectedSubcategory === sub.slug ? 'none' : '1px solid #E5E7EB',
                    borderRadius: 20,
                    fontSize: 14,
                    fontWeight: 500,
                    color: selectedSubcategory === sub.slug ? '#FFFFFF' : '#1F2937',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  data-testid={`subcategory-${sub.slug}`}
                >
                  {sub.icon && <span style={{ marginRight: 6 }}>{sub.icon}</span>}
                  {sub.name}
                </button>
              ))}
            </div>
            
            {subcategories.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 20,
                color: '#6B7280',
              }}>
                Нет подкатегорий
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sort Sheet */}
      {showSortSheet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowSortSheet(false)}
        >
          <div
            style={{
              width: '100%',
              background: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '16px 16px 32px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 20px',
            }} />
            
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1F2937',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Сортировка
            </h3>
            
            {availableSortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setShowSortSheet(false);
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: sortBy === option.value ? '#F0F7FF' : '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  marginBottom: 8,
                  textAlign: 'left',
                  fontSize: 15,
                  fontWeight: sortBy === option.value ? 600 : 400,
                  color: sortBy === option.value ? '#3A7BFF' : '#1F2937',
                  cursor: 'pointer',
                }}
                data-testid={`sort-option-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
