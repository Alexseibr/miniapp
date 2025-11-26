import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import useGeoStore from '../store/useGeoStore';
import { 
  Search, MapPin, Locate, Package, 
  ChevronUp, ChevronDown, Sparkles, X, AlertCircle, RefreshCw,
  Leaf, Store, User, Loader2
} from 'lucide-react';
import { getThumbnailUrl, NO_PHOTO_PLACEHOLDER } from '@/constants/placeholders';

const RADIUS_OPTIONS = [
  { value: 0.3, label: '300м' },
  { value: 1, label: '1км' },
  { value: 3, label: '3км' },
  { value: 5, label: '5км' },
  { value: 10, label: '10км' },
  { value: 20, label: '20км' },
];

type SellerType = 'farmer' | 'store' | 'private';

interface Ad {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  photos?: string[];
  distanceKm?: number;
  categoryId?: string;
  createdAt?: string;
  isFarmerAd?: boolean;
  sellerName?: string;
  location?: { lat: number; lng: number };
}

const getSellerType = (ad: Ad): SellerType => {
  if (ad.isFarmerAd) return 'farmer';
  if (ad.categoryId?.includes('store') || ad.categoryId?.includes('shop')) return 'store';
  return 'private';
};

const getSellerTypeLabel = (type: SellerType) => {
  switch (type) {
    case 'farmer': return 'Фермер';
    case 'store': return 'Магазин';
    default: return 'Частное лицо';
  }
};

const formatPrice = (price: number) => {
  return `${price.toLocaleString()} руб.`;
};

const LazyMap = lazy(() => import('../components/GeoMap'));

function MapFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
        <p className="text-sm text-gray-500">Загрузка карты...</p>
      </div>
    </div>
  );
}

export default function GeoFeedScreen() {
  const navigate = useNavigate();
  const { 
    coords, radiusKm, setRadius, cityName, requestLocation, 
    smartRadiusEnabled, toggleSmartRadius, sheetHeight, setSheetHeight,
    calculateSmartRadius, status: geoStatus
  } = useGeoStore();
  
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [feed, setFeed] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartRadiusMessage, setSmartRadiusMessage] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);
  const dragStartY = useRef(0);

  const fetchNearbyAds = useCallback(async (centerLat: number, centerLng: number, radius: number, query?: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        lat: String(centerLat),
        lng: String(centerLng),
        radiusKm: String(radius),
      });
      
      if (query) {
        params.append('q', query);
      }
      
      const response = await fetch(`/api/ads/nearby?${params}`, {
        signal: abortRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки');
      }
      
      const data = await response.json();
      const ads = data.items || data.data?.ads || data.data || [];
      setFeed(ads);
      
      if (smartRadiusEnabled && ads.length === 0 && radius < 20) {
        const nextRadius = RADIUS_OPTIONS.find(r => r.value > radius)?.value || 20;
        setSmartRadiusMessage(`Увеличили радиус до ${nextRadius < 1 ? `${nextRadius * 1000}м` : `${nextRadius}км`}`);
        setRadius(nextRadius);
      } else {
        calculateSmartRadius(ads.length);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch nearby ads:', err);
        setError('Не удалось загрузить объявления');
      }
    } finally {
      setLoading(false);
    }
  }, [smartRadiusEnabled, setRadius, calculateSmartRadius]);

  useEffect(() => {
    if (lat && lng) {
      fetchNearbyAds(lat, lng, radiusKm, searchQuery);
    }
  }, [lat, lng, radiusKm]);

  useEffect(() => {
    if (!lat || !lng) {
      requestLocation();
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (lat && lng) {
      fetchNearbyAds(lat, lng, radiusKm, searchQuery);
    }
  }, [lat, lng, radiusKm, searchQuery, fetchNearbyAds]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      await requestLocation();
    } finally {
      setIsLocating(false);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    if (smartRadiusEnabled) {
      toggleSmartRadius();
    }
    setSmartRadiusMessage(null);
    setRadius(newRadius);
  };

  const handleSmartToggle = () => {
    toggleSmartRadius();
    setSmartRadiusMessage(null);
  };

  const handleAdClick = useCallback((adId: string) => {
    navigate(`/ads/${adId}`);
  }, [navigate]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
  };

  const handleDragEnd = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const diff = dragStartY.current - clientY;
    
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        setSheetHeight(sheetHeight === 'collapsed' ? 'half' : 'full');
      } else {
        setSheetHeight(sheetHeight === 'full' ? 'half' : 'collapsed');
      }
    }
  };

  const handleIncreaseRadius = () => {
    const currentIndex = RADIUS_OPTIONS.findIndex(r => r.value === radiusKm);
    if (currentIndex < RADIUS_OPTIONS.length - 1) {
      setRadius(RADIUS_OPTIONS[currentIndex + 1].value);
    }
  };

  const handleRetry = () => {
    if (lat && lng) {
      fetchNearbyAds(lat, lng, radiusKm, searchQuery);
    }
  };

  const sheetHeightValue = useMemo(() => ({
    collapsed: 15,
    half: 45,
    full: 75
  }[sheetHeight]), [sheetHeight]);

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden"
      style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      {/* TOP AREA */}
      <div className="flex-shrink-0 bg-white shadow-sm z-20">
        {/* Search Input */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Поиск товаров рядом..."
              className="w-full h-11 pl-11 pr-10 rounded-2xl bg-gray-100 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                onClick={() => { setSearchQuery(''); handleSearch(); }}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>
        
        {/* Radius Chips */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r.value}
                className={`flex-shrink-0 h-8 px-4 rounded-full text-sm font-medium transition-all ${
                  radiusKm === r.value && !smartRadiusEnabled
                    ? 'bg-blue-50 text-blue-600 border-2 border-blue-400' 
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
                onClick={() => handleRadiusChange(r.value)}
                data-testid={`button-radius-${r.value}`}
              >
                {r.label}
              </button>
            ))}
            <button
              className={`flex-shrink-0 h-8 px-4 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                smartRadiusEnabled
                  ? 'bg-purple-50 text-purple-600 border-2 border-purple-400' 
                  : 'bg-gray-100 text-purple-600 border-2 border-transparent hover:bg-purple-50'
              }`}
              onClick={handleSmartToggle}
              data-testid="button-smart-radius"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart
            </button>
          </div>
        </div>
        
        {/* Smart radius message */}
        {smartRadiusMessage && (
          <div className="px-4 pb-3">
            <div className="px-3 py-2 rounded-xl bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Sparkles className="w-4 h-4" />
                <span>{smartRadiusMessage}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAP + BOTTOM SHEET CONTAINER */}
      <div className="flex-1 relative min-h-0">
        {/* Map View */}
        <div className="absolute inset-0">
          {(lat && lng) ? (
            <Suspense fallback={<MapFallback />}>
              <LazyMap 
                lat={lat} 
                lng={lng} 
                radiusKm={radiusKm}
                feed={feed}
                selectedAdId={selectedAdId}
                onMarkerClick={(adId: string) => {
                  setSelectedAdId(adId);
                  setSheetHeight('half');
                }}
                onMapMove={(centerLat: number, centerLng: number) => {
                  if (debounceRef.current) {
                    clearTimeout(debounceRef.current);
                  }
                  debounceRef.current = setTimeout(() => {
                    fetchNearbyAds(centerLat, centerLng, radiusKm, searchQuery);
                  }, 400);
                }}
              />
            </Suspense>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center p-6">
                {geoStatus === 'loading' || isLocating ? (
                  <>
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                    <p className="text-gray-600 font-medium">Определяем местоположение...</p>
                  </>
                ) : geoStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                    <p className="text-gray-700 font-medium">Не удалось определить местоположение</p>
                    <p className="text-sm text-gray-500 mt-1">Разрешите доступ к геолокации</p>
                    <button
                      className="mt-4 px-4 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm active:scale-95 transition-transform"
                      onClick={handleLocate}
                      data-testid="button-retry-location"
                    >
                      Попробовать снова
                    </button>
                  </>
                ) : (
                  <>
                    <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 font-medium">Загрузка карты...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Floating Locate Button */}
        {lat && lng && (
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full shadow-lg bg-white flex items-center justify-center active:scale-95 transition-transform z-10"
            onClick={handleLocate}
            disabled={isLocating}
            data-testid="button-locate"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-pulse text-blue-500' : 'text-gray-700'}`} />
          </button>
        )}

        {/* BOTTOM SHEET */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.08)] flex flex-col transition-all duration-300 ease-out z-10"
          style={{ height: `${sheetHeightValue}%`, maxHeight: 'calc(100% - 60px)' }}
        >
          {/* Sheet Handle */}
          <div 
            className="flex justify-center py-3 cursor-pointer touch-none select-none"
            onTouchStart={handleDragStart}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          
          {/* Sheet Header */}
          <div className="flex-shrink-0 px-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Рядом с вами</h2>
                {cityName && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>{cityName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full" data-testid="text-ads-count">
                  {feed.length} объявл.
                </span>
                <button
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
                  onClick={() => setSheetHeight(sheetHeight === 'full' ? 'collapsed' : 'full')}
                  data-testid="button-expand-sheet"
                >
                  {sheetHeight === 'full' ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sheet Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <AlertCircle className="w-14 h-14 text-red-400 mb-3" />
                <p className="text-gray-700 font-medium text-center">{error}</p>
                <button
                  className="mt-4 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm flex items-center gap-2 active:scale-95 transition-transform"
                  onClick={handleRetry}
                  data-testid="button-retry"
                >
                  <RefreshCw className="w-4 h-4" />
                  Повторить
                </button>
              </div>
            ) : loading ? (
              <div className="p-4 space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl bg-gray-50 animate-pulse">
                    <div className="w-20 h-20 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-3/4 bg-gray-200 rounded-lg" />
                      <div className="h-5 w-1/3 bg-gray-200 rounded-lg" />
                      <div className="h-3 w-1/4 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.length > 0 ? (
              <div className="p-4 space-y-3 pb-6">
                {feed.map((ad) => {
                  const sellerType = getSellerType(ad);
                  const TypeIcon = sellerType === 'farmer' ? Leaf : sellerType === 'store' ? Store : User;
                  const typeColor = sellerType === 'farmer' ? 'text-green-600 bg-green-50' : sellerType === 'store' ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50';
                  
                  return (
                    <div 
                      key={ad._id}
                      className={`flex gap-3 p-3 rounded-2xl bg-white border-2 cursor-pointer active:scale-[0.98] transition-all ${
                        ad._id === selectedAdId ? 'border-blue-400 shadow-md' : 'border-gray-100 hover:border-gray-200'
                      }`}
                      onClick={() => handleAdClick(ad._id)}
                      data-testid={`card-ad-${ad._id}`}
                    >
                      <div className="flex-shrink-0 relative">
                        {ad.photos?.[0] ? (
                          <img 
                            src={getThumbnailUrl(ad.photos[0])} 
                            alt={ad.title}
                            className="w-20 h-20 rounded-xl object-cover bg-gray-200"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center"
                          style={{ display: ad.photos?.[0] ? 'none' : 'flex' }}
                        >
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{ad.title}</h4>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {formatPrice(ad.price)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
                            <TypeIcon className="w-3 h-3" />
                            {getSellerTypeLabel(sellerType)}
                          </span>
                          {ad.distanceKm !== undefined && (
                            <span className="text-xs text-gray-500">
                              {ad.distanceKm < 1 ? `${Math.round(ad.distanceKm * 1000)}м` : `${ad.distanceKm.toFixed(1)}км`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <MapPin className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-gray-700 font-medium text-center">Нет объявлений рядом</p>
                <p className="text-sm text-gray-500 mt-1 text-center">Попробуйте увеличить радиус поиска</p>
                {radiusKm < 20 && (
                  <button 
                    className="mt-4 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm flex items-center gap-2 active:scale-95 transition-transform"
                    onClick={handleIncreaseRadius}
                    data-testid="button-increase-radius"
                  >
                    <ChevronUp className="w-4 h-4" />
                    Увеличить радиус
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
