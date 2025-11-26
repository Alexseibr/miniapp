import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, SlidersHorizontal, ChevronDown, MapPin } from 'lucide-react';
import { useGeo } from '@/utils/geo';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

interface Ad {
  _id: string;
  title: string;
  description?: string;
  price?: number;
  photos?: string[];
  distanceKm?: number;
  createdAt: string;
  categoryId?: string;
  subcategoryId?: string;
}

interface FilterChip {
  id: string;
  label: string;
  active: boolean;
}

const RADIUS_OPTIONS = [
  { value: 5, label: '5 км' },
  { value: 10, label: '10 км' },
  { value: 30, label: '30 км' },
  { value: 50, label: '50 км' },
  { value: 100, label: '100 км' },
  { value: 500, label: 'Вся страна' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'По дате' },
  { value: 'distance', label: 'По удалению' },
  { value: 'price_asc', label: 'Сначала дешёвые' },
  { value: 'price_desc', label: 'Сначала дорогие' },
];

export default function SearchResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const { coords, radiusKm, status: geoStatus, requestLocation, cityName } = useGeo();
  
  // Используем координаты из useGeo или дефолт Минск
  const userLat = coords?.lat || 53.9;
  const userLng = coords?.lng || 27.5667;
  const hasLocation = !!coords;
  
  const [searchText, setSearchText] = useState(query);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRadius, setSelectedRadius] = useState(radiusKm || 100);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [
      { id: 'all', label: 'Всё', active: activeFilter === 'all' },
      { id: 'farmer', label: 'Фермерские товары', active: activeFilter === 'farmer' },
      { id: 'fresh', label: 'Свежие', active: activeFilter === 'fresh' },
      { id: 'today', label: 'Сегодня', active: activeFilter === 'today' },
    ];
    return chips;
  }, [activeFilter]);

  useEffect(() => {
    if (!query) return;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        console.log('🔍 Поиск:', query);
        console.log('📍 Координаты:', { lat: userLat, lng: userLng, hasLocation, cityName });
        console.log('📏 Радиус:', selectedRadius, 'км');
        
        const params = new URLSearchParams({
          query: query,
          lat: String(userLat),
          lng: String(userLng),
          radiusKm: String(selectedRadius),
          sort: sortBy === 'newest' ? 'date' : sortBy,
          limit: '50',
        });
        
        console.log('🌐 API запрос:', `/api/search?${params.toString()}`);
        const response = await fetch(`/api/search?${params.toString()}`);
        const data = await response.json();
        
        console.log('📦 Ответ API:', data);
        
        let items = data.items || data.ads || [];
        
        if (activeFilter === 'fresh') {
          const now = new Date();
          items = items.filter((ad: Ad) => {
            const created = new Date(ad.createdAt);
            const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
            return hoursDiff < 48;
          });
        } else if (activeFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          items = items.filter((ad: Ad) => {
            const created = new Date(ad.createdAt);
            return created >= today;
          });
        }
        
        setAds(items);
        setTotalCount(items.length);
      } catch (error) {
        console.error('Search error:', error);
        setAds([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [query, userLat, userLng, selectedRadius, sortBy, activeFilter]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/search/results?q=${encodeURIComponent(searchText.trim())}`);
    }
  };

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleAdClick = (adId: string) => {
    navigate(`/ads/${adId}`);
  };

  const formatDistance = (km?: number) => {
    if (km === undefined || km === null) return '';
    if (km < 1) return `${Math.round(km * 1000)} м`;
    return `${km.toFixed(1)} км`;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'Цена не указана';
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const isNew = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
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
        {/* Search Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
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

          <form onSubmit={handleSearch} style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: '#F5F6F8',
              borderRadius: 20,
              border: '1px solid #E5E7EB',
            }}>
              <Search size={18} color="#9CA3AF" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Поиск..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 16,
                  color: '#1F2937',
                  outline: 'none',
                }}
                data-testid="input-search-results"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    background: '#E5E7EB',
                    border: 'none',
                    borderRadius: '50%',
                    width: 20,
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  data-testid="button-clear-search"
                >
                  <X size={12} color="#6B7280" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filter Chips Row */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 12px 12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: chip.active ? 'none' : '1px solid #E5E7EB',
                background: chip.active ? '#3A7BFF' : '#FFFFFF',
                color: chip.active ? '#FFFFFF' : '#1F2937',
                fontSize: 14,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
              data-testid={`filter-chip-${chip.id}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div style={{ flex: 1, padding: '12px 16px', paddingBottom: 100 }}>
        {/* Location Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
          padding: '8px 12px',
          background: hasLocation ? '#EFF6FF' : '#FEF3C7',
          borderRadius: 10,
          border: hasLocation ? '1px solid #BFDBFE' : '1px solid #FDE68A',
        }}>
          <MapPin size={16} color={hasLocation ? '#3B82F6' : '#F59E0B'} />
          {hasLocation ? (
            <span style={{ fontSize: 13, color: '#1D4ED8' }} data-testid="text-location-info">
              📍 {cityName || `${userLat.toFixed(2)}, ${userLng.toFixed(2)}`} • {selectedRadius} км
            </span>
          ) : (
            <button
              onClick={() => requestLocation()}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 13,
                color: '#D97706',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
              data-testid="button-request-location"
            >
              Определить местоположение для точного поиска
            </button>
          )}
        </div>

        {/* Results Count + Sort */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <span 
            style={{
              fontSize: 14,
              color: '#6B7280',
            }}
            data-testid="text-results-count"
          >
            Найдено {totalCount} результатов
          </span>
          
          <button
            onClick={() => setShowSortSheet(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              background: '#F5F6F8',
              border: '1px solid #E5E7EB',
              borderRadius: 16,
              fontSize: 13,
              color: '#1F2937',
              cursor: 'pointer',
            }}
            data-testid="button-sort"
          >
            <SlidersHorizontal size={14} />
            <span>Сортировка</span>
            <ChevronDown size={14} />
          </button>
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
            }}>🔍</div>
            <h3 
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1F2937',
                marginBottom: 8,
              }}
              data-testid="text-empty-state"
            >
              Ничего не найдено
            </h3>
            <p style={{
              fontSize: 14,
              color: '#6B7280',
            }}>
              Попробуйте изменить запрос или увеличить радиус поиска
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
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
            
            {SORT_OPTIONS.map((option) => (
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
