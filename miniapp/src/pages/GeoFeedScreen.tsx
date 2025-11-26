import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useGeoStore from '../store/useGeoStore';
import { 
  Search, MapPin, Locate, Package, 
  ChevronUp, ChevronDown, Sparkles, X, AlertCircle, RefreshCw,
  Leaf, Store, User
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const RADIUS_OPTIONS = [
  { value: 0.3, label: '300м' },
  { value: 1, label: '1км' },
  { value: 3, label: '3км' },
  { value: 5, label: '5км' },
  { value: 10, label: '10км' },
  { value: 20, label: '20км' },
];

type SellerType = 'farmer' | 'store' | 'private';

const getSellerType = (ad: Ad): SellerType => {
  if (ad.isFarmerAd) return 'farmer';
  if (ad.categoryId?.includes('store') || ad.categoryId?.includes('shop')) return 'store';
  return 'private';
};

const createMarkerIcon = (type: SellerType, isSelected: boolean = false) => {
  const colors = {
    private: { from: '#3B82F6', to: '#60A5FA', shadow: 'rgba(59, 130, 246, 0.4)' },
    farmer: { from: '#22C55E', to: '#4ADE80', shadow: 'rgba(34, 197, 94, 0.4)' },
    store: { from: '#8B5CF6', to: '#C084FC', shadow: 'rgba(139, 92, 246, 0.4)' }
  };
  
  const icons = {
    private: `<circle cx="16" cy="14" r="4" fill="white"/>`,
    farmer: `<path d="M16 8c-2 0-4 2-4 5s2 6 4 6 4-3 4-6-2-5-4-5z" fill="white" opacity="0.9"/><path d="M16 10c-1.5 0-2.5 1.5-2.5 3.5s1 4 2.5 4 2.5-2 2.5-4-1-3.5-2.5-3.5z" fill="none" stroke="white" stroke-width="1"/>`,
    store: `<rect x="11" y="12" width="10" height="7" rx="1" fill="white"/><path d="M13 12V10a3 3 0 016 0v2" stroke="white" stroke-width="1.5" fill="none"/>`
  };
  
  const c = colors[type];
  const scale = isSelected ? 1.15 : 1;
  
  return L.divIcon({
    className: 'ketmar-marker',
    html: `
      <div style="
        transform: scale(${scale});
        transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
        filter: drop-shadow(0 4px 8px ${c.shadow});
      ">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <defs>
            <linearGradient id="pin-${type}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${c.from}"/>
              <stop offset="100%" stop-color="${c.to}"/>
            </linearGradient>
          </defs>
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="url(#pin-${type})"/>
          ${icons[type]}
        </svg>
      </div>
    `,
    iconSize: [32, 40],
    iconAnchor: [16, 40]
  });
};

const userIcon = L.divIcon({
  className: 'ketmar-user-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; inset: -8px; background: rgba(59, 130, 246, 0.2); border-radius: 50%; animation: userPulse 2s ease-out infinite;"></div>
      <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #3B82F6, #1D4ED8); border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.5);"></div>
      <div style="position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; background: white; border-radius: 50%; transform: translate(-50%, -50%);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const createClusterIcon = (count: number, dominantType: SellerType) => {
  const colors = {
    private: { from: '#3B82F6', to: '#60A5FA' },
    farmer: { from: '#22C55E', to: '#4ADE80' },
    store: { from: '#8B5CF6', to: '#C084FC' }
  };
  const c = colors[dominantType];
  
  return L.divIcon({
    className: 'ketmar-cluster-marker',
    html: `
      <div style="
        width: 48px; height: 48px;
        background: linear-gradient(135deg, ${c.from}, ${c.to});
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
        animation: clusterAppear 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
      ">
        <span style="color: white; font-size: 15px; font-weight: 700;">${count > 99 ? '99+' : count}</span>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24]
  });
};

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

interface ClusterData {
  geoHash: string;
  lat: number;
  lng: number;
  count: number;
  isCluster: boolean;
  adId?: string;
  sampleAd?: Ad;
  dominantType?: SellerType;
}

function MapController({ 
  center, 
  zoom, 
  onMove 
}: { 
  center: [number, number]; 
  zoom: number;
  onMove?: (center: { lat: number; lng: number }, zoom: number) => void;
}) {
  const map = useMap();
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!initializedRef.current && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, zoom);
      initializedRef.current = true;
    }
  }, [center, zoom, map]);
  
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove?.({ lat: c.lat, lng: c.lng }, map.getZoom());
    }
  });
  
  return null;
}

export default function GeoFeedScreen() {
  const navigate = useNavigate();
  const { 
    coords, radiusKm, setRadius, cityName, requestLocation, 
    smartRadiusEnabled, toggleSmartRadius, sheetHeight, setSheetHeight,
    calculateSmartRadius, setMapCenter, status: geoStatus
  } = useGeoStore();
  
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [feed, setFeed] = useState<Ad[]>([]);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(14);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartRadiusMessage, setSmartRadiusMessage] = useState<string | null>(null);
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  
  const defaultCenter: [number, number] = useMemo(() => {
    if (lat && lng) return [lat, lng];
    return [53.9, 27.5667];
  }, [lat, lng]);

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
      
      const newClusters: ClusterData[] = ads.map((ad: Ad, index: number) => {
        const adLat = ad.location?.lat || centerLat + (Math.random() - 0.5) * 0.02;
        const adLng = ad.location?.lng || centerLng + (Math.random() - 0.5) * 0.02;
        return {
          geoHash: `ad-${ad._id}-${index}`,
          lat: adLat,
          lng: adLng,
          count: 1,
          isCluster: false,
          adId: ad._id,
          sampleAd: ad,
          dominantType: getSellerType(ad)
        };
      });
      setClusters(newClusters);
      
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

  const handleMapMove = useCallback((center: { lat: number; lng: number }, newZoom: number) => {
    setZoom(newZoom);
    setMapCenter({ ...center, zoom: newZoom });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchNearbyAds(center.lat, center.lng, radiusKm, searchQuery);
    }, 400);
  }, [radiusKm, searchQuery, fetchNearbyAds, setMapCenter]);

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

  const handleMarkerClick = useCallback((cluster: ClusterData) => {
    if (!cluster.isCluster && cluster.adId) {
      setSelectedAdId(cluster.adId);
      setSheetHeight('half');
    } else {
      setSheetHeight('full');
    }
  }, [setSheetHeight]);

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

  const formatPrice = (price: number, currency?: string) => {
    return `${price.toLocaleString()} ${currency || 'BYN'}`;
  };

  const getSellerTypeLabel = (type: SellerType) => {
    switch (type) {
      case 'farmer': return 'Фермер';
      case 'store': return 'Магазин';
      default: return 'Частный продавец';
    }
  };

  const sheetHeightValue = {
    collapsed: 15,
    half: 45,
    full: 75
  }[sheetHeight];

  const selectedAd = feed.find(ad => ad._id === selectedAdId);

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden"
      style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <style>{`
        @keyframes userPulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes clusterAppear {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .leaflet-container { 
          width: 100%; 
          height: 100%; 
          font-family: inherit;
        }
        .leaflet-control-attribution {
          font-size: 10px !important;
          background: rgba(255,255,255,0.8) !important;
          padding: 2px 6px !important;
        }
      `}</style>
      
      {/* ========== TOP AREA ========== */}
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
        
        {/* Radius Chips - Horizontal Scroll */}
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

      {/* ========== MAP + BOTTOM SHEET CONTAINER ========== */}
      <div className="flex-1 relative min-h-0">
        {/* Map View */}
        <div className="absolute inset-0">
          {(lat && lng) ? (
            <MapContainer
              center={defaultCenter}
              zoom={zoom}
              className="w-full h-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapController 
                center={defaultCenter} 
                zoom={zoom} 
                onMove={handleMapMove}
              />
              
              {/* User location marker */}
              <Marker position={[lat, lng]} icon={userIcon} />
              
              {/* Radius circle */}
              <Circle
                center={[lat, lng]}
                radius={radiusKm * 1000}
                pathOptions={{
                  color: '#3B82F6',
                  fillColor: '#3B82F6',
                  fillOpacity: 0.06,
                  weight: 2,
                  dashArray: '8, 12'
                }}
              />
              
              {/* Ad markers */}
              {clusters.map((cluster) => (
                <Marker
                  key={cluster.geoHash}
                  position={[cluster.lat, cluster.lng]}
                  icon={
                    cluster.isCluster 
                      ? createClusterIcon(cluster.count, cluster.dominantType || 'private')
                      : createMarkerIcon(cluster.dominantType || 'private', cluster.adId === selectedAdId)
                  }
                  eventHandlers={{
                    click: () => handleMarkerClick(cluster)
                  }}
                />
              ))}
            </MapContainer>
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

        {/* ========== BOTTOM SHEET ========== */}
        <div 
          ref={sheetRef}
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
                      <div className="flex-shrink-0">
                        {ad.photos?.[0] ? (
                          <img 
                            src={ad.photos[0]} 
                            alt={ad.title}
                            className="w-20 h-20 rounded-xl object-cover bg-gray-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{ad.title}</h4>
                        <p className="text-lg font-bold text-blue-600 mt-1">
                          {formatPrice(ad.price, ad.currency)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${typeColor}`}>
                            <TypeIcon className="w-3 h-3" />
                            {getSellerTypeLabel(sellerType)}
                          </span>
                          {ad.distanceKm !== undefined && (
                            <span className="text-xs text-gray-500">
                              {ad.distanceKm} км
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
