import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal, ArrowUpDown, Heart, MapPin, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CategoryGrid from '@/components/CategoryGrid';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useGeo } from '@/utils/geo';
import { AdPreview } from '@/types';

const RADIUS_PRESETS = [
  { value: 0.3, label: '300м' },
  { value: 1, label: '1км' },
  { value: 3, label: '3км' },
  { value: 5, label: '5км' },
  { value: 10, label: '10км' },
];

type SortOption = 'distance' | 'price_asc' | 'price_desc' | 'date';

export default function SubcategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { categories, loading, loadCategories, getCategoryBySlug } = useCategoriesStore();
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [showSort, setShowSort] = useState(false);
  
  const { coords, setRadius } = useGeo(false);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const category = useMemo(() => getCategoryBySlug(slug || ''), [slug, categories, getCategoryBySlug]);
  const subcategories = useMemo(() => category?.subcategories || [], [category]);

  const { data: adsData, isLoading: adsLoading } = useQuery<any>({
    queryKey: ['/api/ads/search', { 
      categorySlug: slug,
      radiusKm: selectedRadius,
      lat: coords?.lat,
      lng: coords?.lng,
      limit: 50 
    }],
    enabled: !!slug && !!category,
  });

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
      case 'date':
        return sorted.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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

  // If category has subcategories, show them
  if (subcategories.length > 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FFFFFF',
        paddingBottom: 100,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #F0F2F5',
        }}>
          <button
            onClick={handleBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#F5F6F8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#1F2937" />
          </button>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
          }}>
            {category.name}
          </h1>
        </div>
        
        <div style={{ padding: 16 }}>
          <CategoryGrid categories={subcategories} />
        </div>
      </div>
    );
  }

  // Show ads for leaf category
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      paddingBottom: 120,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: '#FFFFFF',
        zIndex: 20,
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
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#F5F6F8',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            data-testid="button-back"
          >
            <ArrowLeft size={20} color="#1F2937" />
          </button>
          
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1F2937',
            margin: 0,
            flex: 1,
          }}>
            {category.name}
          </h1>
        </div>

        {/* Radius Chips */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 16px 12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleRadiusChange(preset.value)}
              style={{
                flexShrink: 0,
                padding: '10px 18px',
                background: selectedRadius === preset.value ? '#3A7BFF' : '#FFFFFF',
                border: selectedRadius === preset.value ? 'none' : '1px solid #E5E7EB',
                borderRadius: 20,
                fontSize: 14,
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
      <div style={{ padding: 16 }}>
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
              Нет объявлений в этом радиусе
            </p>
            <p style={{
              fontSize: 14,
              color: '#9CA3AF',
              margin: 0,
            }}>
              Попробуйте увеличить радиус поиска
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
        left: 16,
        right: 16,
        display: 'flex',
        gap: 12,
        padding: '12px 0',
        zIndex: 20,
      }}>
        <button
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 20px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 500,
            color: '#1F2937',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          data-testid="button-filters"
        >
          <SlidersHorizontal size={18} />
          Фильтры
        </button>
        
        <button
          onClick={() => setShowSort(!showSort)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 20px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 500,
            color: '#1F2937',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          data-testid="button-sort"
        >
          <ArrowUpDown size={18} />
          Сортировка
        </button>
      </div>

      {/* Sort Dropdown */}
      {showSort && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              margin: '0 0 16px',
              color: '#1F2937',
            }}>
              Сортировка
            </h3>
            
            {[
              { value: 'distance', label: 'По расстоянию' },
              { value: 'date', label: 'По дате' },
              { value: 'price_asc', label: 'Сначала дешевые' },
              { value: 'price_desc', label: 'Сначала дорогие' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value as SortOption);
                  setShowSort(false);
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: sortBy === option.value ? '#EBF3FF' : 'transparent',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: sortBy === option.value ? 600 : 400,
                  color: sortBy === option.value ? '#3A7BFF' : '#1F2937',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 4,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryAdCard({ ad }: { ad: AdPreview }) {
  const navigate = useNavigate();
  
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
            📦
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
        </div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{
          fontSize: 22,
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
