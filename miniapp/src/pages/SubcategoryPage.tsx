import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ArrowUpDown, Heart, MapPin, Loader2, X, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { AdPreview, CategoryNode } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useUserStore } from '@/store/useUserStore';

const RADIUS_PRESETS = [
  { value: 0.3, label: '300м' },
  { value: 1, label: '1км' },
  { value: 3, label: '3км' },
  { value: 5, label: '5км' },
  { value: 10, label: '10км' },
  { value: 20, label: '20км' },
];

const DEFAULT_RADIUS = 3;

type SortOption = 'distance' | 'price_asc' | 'price_desc' | 'date_new' | 'date_old';

const SORT_OPTIONS = [
  { value: 'distance', label: 'По расстоянию' },
  { value: 'date_new', label: 'По дате: сначала новые' },
  { value: 'date_old', label: 'По дате: сначала старые' },
  { value: 'price_asc', label: 'По цене: от дешёвых' },
  { value: 'price_desc', label: 'По цене: от дорогих' },
];

interface SubcategoryFacet {
  subcategoryId: string;
  subcategorySlug: string;
  title: string;
  adsCount: number;
}

export default function SubcategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { categories, loading, loadCategories, getCategoryBySlug } = useCategoriesStore();
  const [selectedRadius, setSelectedRadius] = useState(DEFAULT_RADIUS);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [tempSelectedSubcategory, setTempSelectedSubcategory] = useState<string | null>(null);
  
  const { coords, setRadius } = useGeo(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = useMemo(() => getCategoryBySlug(slug || ''), [slug, categories, getCategoryBySlug]);
  const subcategories = useMemo(() => category?.subcategories || [], [category]);

  // Fetch ads with all parameters
  const { data: adsData, isLoading: adsLoading, refetch } = useQuery<any>({
    queryKey: ['/api/ads/nearby', { 
      categoryId: slug,
      subcategoryId: selectedSubcategory,
      radiusKm: selectedRadius,
      lat: coords?.lat,
      lng: coords?.lng,
      sort: sortBy === 'price_asc' ? 'cheapest' : 
            sortBy === 'price_desc' ? 'expensive' : 
            sortBy === 'date_new' ? 'newest' :
            sortBy === 'date_old' ? 'oldest' :
            sortBy,
      limit: 50 
    }],
    enabled: !!slug && !!category,
  });

  // Get subcategory facets (counts)
  const { data: facetsData } = useQuery<SubcategoryFacet[]>({
    queryKey: ['/api/ads/category-facets', {
      categorySlug: slug,
      radiusKm: selectedRadius,
      lat: coords?.lat,
      lng: coords?.lng,
    }],
    enabled: !!slug && !!category && subcategories.length > 0,
  });

  const subcategoryFacets = useMemo(() => {
    if (!facetsData) {
      // Fallback: create facets from subcategories without counts
      return subcategories.map(sub => ({
        subcategoryId: sub._id || sub.slug,
        subcategorySlug: sub.slug,
        title: sub.name,
        adsCount: 0,
      }));
    }
    return facetsData;
  }, [facetsData, subcategories]);

  const ads: AdPreview[] = useMemo(() => {
    const items = Array.isArray(adsData)
      ? adsData
      : Array.isArray(adsData?.ads)
        ? adsData.ads
        : Array.isArray(adsData?.items)
          ? adsData.items
          : [];
    
    const sorted = [...items];
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'date_new':
        return sorted.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
      case 'date_old':
        return sorted.sort((a, b) => 
          new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      case 'distance':
      default:
        return sorted.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }
  }, [adsData, sortBy]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRadiusChange = (value: number) => {
    setSelectedRadius(value);
    setRadius(value);
  };

  const handleOpenFilters = () => {
    setTempSelectedSubcategory(selectedSubcategory);
    setShowFilters(true);
  };

  const handleApplyFilters = () => {
    setSelectedSubcategory(tempSelectedSubcategory);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setTempSelectedSubcategory(null);
    setSelectedSubcategory(null);
    setShowFilters(false);
  };

  const handleSelectSort = (value: SortOption) => {
    setSortBy(value);
    setShowSort(false);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '100vh',
        background: '#FFFFFF',
      }}>
        <Loader2 
          size={32} 
          color="#3A7BFF" 
          style={{ animation: 'spin 1s linear infinite' }} 
        />
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: '#FFFFFF',
        padding: 20,
        textAlign: 'center',
      }}>
        <p style={{ color: '#6B7280' }}>Категория не найдена</p>
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 16,
            padding: '12px 24px',
            background: '#3A7BFF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          На главную
        </button>
      </div>
    );
  }

  // Always show ads list (no intermediate subcategory screen)
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      paddingBottom: 140,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#FFFFFF',
        zIndex: 20,
      }}>
        {/* Title Row - centered title with back arrow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 16px 12px',
          position: 'relative',
        }}>
          <button
            onClick={handleBack}
            style={{
              width: 40,
              height: 40,
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              position: 'absolute',
              left: 16,
              zIndex: 1,
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={24} color="#1F2937" />
          </button>
          
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
            width: '100%',
            textAlign: 'center',
            paddingLeft: 40,
            paddingRight: 40,
          }}>
            {category.name}
          </h1>
        </div>

        {/* Radius Chips */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 16px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleRadiusChange(preset.value)}
              style={{
                flexShrink: 0,
                padding: '10px 18px',
                background: selectedRadius === preset.value ? '#3A7BFF' : 'transparent',
                border: 'none',
                borderRadius: 20,
                fontSize: 15,
                fontWeight: 500,
                color: selectedRadius === preset.value ? '#FFFFFF' : '#6B7280',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              data-testid={`radius-${preset.value}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {adsLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: 48,
          }}>
            <Loader2 
              size={32} 
              color="#3A7BFF" 
              style={{ animation: 'spin 1s linear infinite' }} 
            />
          </div>
        ) : ads.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 48,
          }}>
            <div style={{
              width: 64,
              height: 64,
              background: '#F5F6F8',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <MapPin size={28} color="#9CA3AF" />
            </div>
            <p style={{
              fontSize: 16,
              color: '#6B7280',
              margin: '0 0 8px',
            }}>
              В выбранном радиусе пока нет объявлений
            </p>
            <p style={{
              fontSize: 14,
              color: '#9CA3AF',
              margin: 0,
            }}>
              Попробуйте увеличить радиус или изменить фильтры
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            {ads.map((ad) => (
              <CategoryAdCard key={ad._id} ad={ad} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Filter/Sort Bar */}
      <div style={{
        position: 'fixed',
        bottom: 80,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        padding: '12px 16px',
        zIndex: 20,
      }}>
        <button
          onClick={handleOpenFilters}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 28px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 28,
            fontSize: 15,
            fontWeight: 500,
            color: '#1F2937',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          }}
          data-testid="button-filters"
        >
          <SlidersHorizontal size={18} />
          Фильтры
          {selectedSubcategory && (
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#3A7BFF',
              marginLeft: 4,
            }} />
          )}
        </button>
        
        <button
          onClick={() => setShowSort(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 28px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 28,
            fontSize: 15,
            fontWeight: 500,
            color: '#1F2937',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          }}
          data-testid="button-sort"
        >
          <ArrowUpDown size={18} />
          Сортировка
        </button>
      </div>

      {/* Sort Bottom Sheet */}
      {showSort && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 50,
          }}
          onClick={() => setShowSort(false)}
        >
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 40px',
              maxHeight: '60vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{
              width: 40,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 16px',
            }} />
            
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              margin: '0 0 16px',
              color: '#1F2937',
            }}>
              Сортировка
            </h3>
            
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelectSort(option.value as SortOption)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: sortBy === option.value ? '#EBF3FF' : 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: sortBy === option.value ? 600 : 400,
                  color: sortBy === option.value ? '#3A7BFF' : '#1F2937',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                data-testid={`sort-${option.value}`}
              >
                {option.label}
                {sortBy === option.value && (
                  <Check size={20} color="#3A7BFF" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bottom Sheet */}
      {showFilters && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 50,
          }}
          onClick={() => setShowFilters(false)}
        >
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#FFFFFF',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px 40px',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{
              width: 40,
              height: 4,
              background: '#E5E7EB',
              borderRadius: 2,
              margin: '0 auto 16px',
            }} />
            
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                margin: 0,
                color: '#1F2937',
              }}>
                Фильтры
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  width: 32,
                  height: 32,
                  background: '#F5F6F8',
                  border: 'none',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} color="#6B7280" />
              </button>
            </div>

            {/* Subcategories list */}
            {subcategories.length > 0 && (
              <>
                <p style={{
                  fontSize: 14,
                  color: '#6B7280',
                  margin: '0 0 12px',
                }}>
                  Подкатегории
                </p>
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  marginBottom: 16,
                }}>
                  {subcategoryFacets.map((facet) => {
                    const isSelected = tempSelectedSubcategory === facet.subcategorySlug;
                    return (
                      <button
                        key={facet.subcategorySlug}
                        onClick={() => setTempSelectedSubcategory(
                          isSelected ? null : facet.subcategorySlug
                        )}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          background: isSelected ? '#EBF3FF' : 'transparent',
                          border: 'none',
                          borderRadius: 12,
                          fontSize: 15,
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? '#3A7BFF' : '#1F2937',
                          cursor: 'pointer',
                          textAlign: 'left',
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        data-testid={`filter-${facet.subcategorySlug}`}
                      >
                        <span>{facet.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {facet.adsCount > 0 && (
                            <span style={{
                              minWidth: 24,
                              height: 24,
                              background: isSelected ? '#3A7BFF' : '#F0F2F5',
                              color: isSelected ? '#FFFFFF' : '#6B7280',
                              borderRadius: 12,
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 8px',
                            }}>
                              {facet.adsCount}
                            </span>
                          )}
                          {isSelected && (
                            <Check size={20} color="#3A7BFF" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {subcategories.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 32,
                color: '#9CA3AF',
              }}>
                В этой категории нет подкатегорий
              </div>
            )}

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid #F0F2F5',
            }}>
              <button
                onClick={handleResetFilters}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#F5F6F8',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#6B7280',
                  cursor: 'pointer',
                }}
                data-testid="button-reset-filters"
              >
                Сбросить
              </button>
              <button
                onClick={handleApplyFilters}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#3A7BFF',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                }}
                data-testid="button-apply-filters"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryAdCard({ ad }: { ad: AdPreview }) {
  const navigate = useNavigate();
  const user = useUserStore(state => state.user);
  
  const formatPrice = (price: number) => {
    if (price === 0) return 'Даром';
    return `₽${price.toLocaleString('ru-RU')}`;
  };

  const formatDistance = (km?: number) => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)} м от вас`;
    return `${km.toFixed(1)} км от вас`;
  };

  const photoUrl = ad.photos?.[0] 
    ? `/api/media/proxy?url=${encodeURIComponent(ad.photos[0])}&w=600&h=400`
    : null;

  const isFresh = ad.createdAt && 
    (Date.now() - new Date(ad.createdAt).getTime()) < 48 * 60 * 60 * 1000;

  return (
    <button
      onClick={() => navigate(`/ads/${ad._id}`)}
      style={{
        width: '100%',
        background: '#FFFFFF',
        border: 'none',
        borderRadius: 20,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
      }}
      data-testid={`ad-category-${ad._id}`}
    >
      <div style={{
        width: '100%',
        aspectRatio: '16/10',
        background: '#F5F6F8',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={ad.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            fontSize: 40,
          }}>
            <MapPin size={48} color="#D1D5DB" />
          </div>
        )}
        
        {/* Fresh badge */}
        {isFresh && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: '#22C55E',
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 10,
          }}>
            Свежее
          </div>
        )}
        
        {/* Favorite button */}
        <div 
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {user ? (
            <div style={{
              width: 36,
              height: 36,
              background: '#FFFFFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}>
              <FavoriteButton 
                adId={ad._id} 
                size={20}
              />
            </div>
          ) : (
            <div style={{
              width: 36,
              height: 36,
              background: '#FFFFFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}>
              <Heart size={20} color="#9CA3AF" />
            </div>
          )}
        </div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#1F2937',
          marginBottom: 6,
        }}>
          {formatPrice(ad.price)}
        </div>
        
        <div style={{
          fontSize: 15,
          color: '#1F2937',
          marginBottom: 8,
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
            fontSize: 13,
            color: '#9CA3AF',
          }}>
            <MapPin size={14} />
            {formatDistance(ad.distanceKm)}
          </div>
        )}
      </div>
    </button>
  );
}
