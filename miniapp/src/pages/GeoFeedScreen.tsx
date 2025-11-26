import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useGeoStore from '../store/useGeoStore';
import { 
  Search, MapPin, Locate, Package, 
  ChevronUp, ChevronDown, Sparkles, X, AlertCircle, RefreshCw
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

const adMarkerIcon = L.divIcon({
  className: 'ketmar-ad-marker',
  html: `
    <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 14px; font-weight: 700;">K</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const clusterIcon = (count: number) => L.divIcon({
  className: 'ketmar-cluster-marker',
  html: `
    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #F97316, #EA580C); border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 14px; font-weight: 700;">${count > 99 ? '99+' : count}</span>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

interface Ad {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  photos?: string[];
  distanceKm?: string;
  categoryId?: string;
  createdAt?: string;
}

interface ClusterData {
  geoHash: string;
  lat: number;
  lng: number;
  count: number;
  isCluster: boolean;
  adId?: string;
  sampleAd?: { id?: string; title: string; price: number };
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
      
      const newClusters: ClusterData[] = ads.map((ad: Ad, index: number) => ({
        geoHash: `ad-${ad._id}-${index}`,
        lat: centerLat + (Math.random() - 0.5) * 0.01,
        lng: centerLng + (Math.random() - 0.5) * 0.01,
        count: 1,
        isCluster: false,
        adId: ad._id,
        sampleAd: { id: ad._id, title: ad.title, price: ad.price }
      }));
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
    if (!cluster.isCluster) {
      const adId = cluster.adId || cluster.sampleAd?.id;
      if (adId) {
        navigate(`/ads/${adId}`);
      }
    } else {
      setSheetHeight('full');
    }
  }, [navigate, setSheetHeight]);

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

  const sheetHeightStyle = {
    collapsed: '96px',
    half: '45vh',
    full: '80vh'
  }[sheetHeight];

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom))' }}>
      <style>{`
        @keyframes userPulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-container { width: 100%; height: 100%; }
      `}</style>
      
      {/* Top Controls */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 z-20">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Поиск товаров рядом..."
            className="w-full h-12 pl-11 pr-10 rounded-xl bg-gray-100 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:bg-white transition-all"
            data-testid="input-search"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
              onClick={() => { setSearchQuery(''); handleSearch(); }}
              data-testid="button-clear-search"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Radius Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.value}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                radiusKm === r.value && !smartRadiusEnabled
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => handleRadiusChange(r.value)}
              data-testid={`button-radius-${r.value}`}
            >
              {r.label}
            </button>
          ))}
          <button
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
              smartRadiusEnabled
                ? 'bg-purple-500 text-white shadow-sm' 
                : 'bg-gray-100 text-purple-600 hover:bg-purple-50'
            }`}
            onClick={handleSmartToggle}
            data-testid="button-smart-radius"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart
          </button>
        </div>
        
        {/* Location info */}
        {cityName && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span className="truncate">{cityName}</span>
          </div>
        )}
        
        {/* Smart radius message */}
        {smartRadiusMessage && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Sparkles className="w-4 h-4" />
              <span>{smartRadiusMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="relative flex-1 min-h-[150px] transition-all duration-300">
        {(lat && lng) ? (
          <MapContainer
            center={defaultCenter}
            zoom={zoom}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController 
              center={defaultCenter} 
              zoom={zoom} 
              onMove={handleMapMove}
            />
            
            <Marker position={[lat, lng]} icon={userIcon} />
            <Circle
              center={[lat, lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.08,
                weight: 2,
                dashArray: '8, 12'
              }}
            />
            
            {clusters.map((cluster) => (
              <Marker
                key={cluster.geoHash}
                position={[cluster.lat, cluster.lng]}
                icon={cluster.isCluster ? clusterIcon(cluster.count) : adMarkerIcon}
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
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium text-sm"
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
        
        {/* Floating Locate Button */}
        {lat && lng && (
          <button
            className="absolute top-4 right-4 w-12 h-12 rounded-full shadow-lg bg-white flex items-center justify-center active:scale-95 transition-transform z-10"
            onClick={handleLocate}
            disabled={isLocating}
            data-testid="button-locate"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-pulse text-blue-500' : 'text-gray-700'}`} />
          </button>
        )}
      </div>

      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className="flex-shrink-0 bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex flex-col transition-all duration-300 z-10"
        style={{ height: sheetHeightStyle }}
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
            <h2 className="text-lg font-bold text-gray-900">Рядом с вами</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500" data-testid="text-ads-count">
                {feed.length} объявлений
              </span>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                onClick={() => setSheetHeight(sheetHeight === 'full' ? 'half' : 'full')}
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
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <AlertCircle className="w-14 h-14 text-red-400 mb-3" />
              <p className="text-gray-700 font-medium text-center">{error}</p>
              <button
                className="mt-4 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm flex items-center gap-2"
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
              {feed.map((ad) => (
                <div 
                  key={ad._id}
                  className="flex gap-3 p-3 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 active:bg-gray-200/80 transition-colors"
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
                      <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{ad.title}</h4>
                    <p className="text-lg font-bold text-blue-600 mt-1">
                      {formatPrice(ad.price, ad.currency)}
                    </p>
                    {ad.distanceKm && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{ad.distanceKm} км</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                  className="mt-4 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium text-sm flex items-center gap-2"
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
  );
}
