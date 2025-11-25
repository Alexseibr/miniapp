import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useGeoStore from '../store/useGeoStore';
import { 
  Search, MapPin, Locate, TrendingUp, Package, Layers, 
  ChevronUp, ChevronDown, Sparkles, Leaf, Timer, User, Star,
  Zap, ArrowUp, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const RADIUS_OPTIONS = [0.3, 1, 3, 5, 10, 20];

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div style="position: relative;">
      <div style="position: absolute; width: 40px; height: 40px; left: -12px; top: -12px; background: rgba(59, 130, 246, 0.25); border-radius: 50%; animation: ping 2s infinite;"></div>
      <div style="position: relative; width: 18px; height: 18px; background: linear-gradient(135deg, #3B82F6, #2563EB); border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);"></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

const adMarkerIcon = L.divIcon({
  className: 'ad-marker',
  html: `
    <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 50%; border: 2.5px solid white; box-shadow: 0 3px 8px rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 11px; font-weight: 700;">K</span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

const clusterIcon = (count: number) => L.divIcon({
  className: 'cluster-marker',
  html: `
    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #F97316, #EA580C); border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 14px; font-weight: 700;">${count > 99 ? '99+' : count}</span>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

const farmerIcon = L.divIcon({
  className: 'farmer-marker',
  html: `
    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #84CC16, #65A30D); border-radius: 12px; border: 2.5px solid white; box-shadow: 0 3px 10px rgba(132, 204, 22, 0.4); display: flex; align-items: center; justify-content: center; transform: rotate(-10deg);">
      <span style="font-size: 16px;">🌾</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

interface Ad {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  photos?: string[];
  distanceKm?: string;
  categoryId?: string;
  isFarmer?: boolean;
  isSeasonal?: boolean;
  createdAt?: string;
}

interface ClusterData {
  geoHash: string;
  lat: number;
  lng: number;
  count: number;
  avgPrice?: number;
  isCluster: boolean;
  adId?: string;
  sampleAd?: { id?: string; title: string; price: number };
}

interface FarmerPoint {
  lat: number;
  lng: number;
  sellerId: string;
  sellerName?: string;
  itemsCount: number;
  distanceKm: number;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
}

interface FullFeedResponse {
  success: boolean;
  data: {
    feed: Ad[];
    clusters: ClusterData[];
    farmers: FarmerPoint[];
    seasonHighlights: Ad[];
    trendingSearches: string[];
    trendingSupply: string[];
    aiHints: string[];
    totalAds: number;
  };
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
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove?.({ lat: c.lat, lng: c.lng }, map.getZoom());
    }
  });
  
  return null;
}

function HeatmapLayer({ points, type }: { points: HeatmapPoint[]; type: 'demand' | 'supply' }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    
    const layer = L.layerGroup();
    
    points.forEach(point => {
      const color = type === 'demand' 
        ? `rgba(255, ${Math.round(80 + (1 - point.intensity) * 100)}, 60, ${0.25 + point.intensity * 0.35})`
        : `rgba(60, ${Math.round(130 + point.intensity * 100)}, 255, ${0.25 + point.intensity * 0.35})`;
      
      const radius = 80 + point.intensity * 180;
      
      L.circle([point.lat, point.lng], {
        radius,
        color: 'transparent',
        fillColor: color,
        fillOpacity: 0.55
      }).addTo(layer);
    });
    
    layer.addTo(map);
    layerRef.current = layer;
    
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [points, type, map]);
  
  return null;
}

export default function GeoFeedScreen() {
  const navigate = useNavigate();
  const { 
    coords, radiusKm, setRadius, cityName, requestLocation, 
    smartRadiusEnabled, toggleSmartRadius, sheetHeight, setSheetHeight,
    calculateSmartRadius, setMapCenter
  } = useGeoStore();
  
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [feed, setFeed] = useState<Ad[]>([]);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [farmers, setFarmers] = useState<FarmerPoint[]>([]);
  const [seasonHighlights, setSeasonHighlights] = useState<Ad[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [aiHints, setAiHints] = useState<string[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(14);
  const [isLocating, setIsLocating] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'markers' | 'demand' | 'supply'>('markers');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const abortRef = useRef<AbortController | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  
  const defaultCenter: [number, number] = useMemo(() => [lat || 53.9, lng || 27.5667], [lat, lng]);
  
  const sheetHeights = {
    collapsed: 'h-20',
    half: 'h-[45vh]',
    full: 'h-[85vh]'
  };
  
  const mapHeights = {
    collapsed: 'h-[calc(100vh-80px)]',
    half: 'h-[55vh]',
    full: 'h-[15vh]'
  };

  const fetchFullFeed = useCallback(async (centerLat: number, centerLng: number) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(centerLat),
        lng: String(centerLng),
        radius: String(radiusKm),
        ...(searchQuery && { q: searchQuery }),
        ...(selectedCategory && { category: selectedCategory })
      });
      
      const response = await fetch(`/api/geo/full-feed?${params}`, {
        signal: abortRef.current.signal
      });
      
      const data: FullFeedResponse = await response.json();
      
      if (data.success) {
        setFeed(data.data.feed || []);
        setClusters(data.data.clusters || []);
        setFarmers(data.data.farmers || []);
        setSeasonHighlights(data.data.seasonHighlights || []);
        setTrendingSearches(data.data.trendingSearches || []);
        setAiHints(data.data.aiHints || []);
        
        calculateSmartRadius(data.data.totalAds || data.data.feed?.length || 0);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch full feed:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [radiusKm, searchQuery, selectedCategory, calculateSmartRadius]);

  const fetchHeatmap = useCallback(async (centerLat: number, centerLng: number, type: 'demand' | 'supply') => {
    try {
      const endpoint = type === 'demand' ? 'heatmap/demand' : 'heatmap/supply';
      const response = await fetch(
        `/api/geo-intelligence/${endpoint}?lat=${centerLat}&lng=${centerLng}&radiusKm=${radiusKm}`
      );
      const data = await response.json();
      if (data.success) {
        setHeatmapPoints(data.data.points);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    }
  }, [radiusKm]);

  useEffect(() => {
    if (lat && lng) {
      fetchFullFeed(lat, lng);
      if (activeLayer !== 'markers') {
        fetchHeatmap(lat, lng, activeLayer);
      }
    }
  }, [lat, lng, radiusKm, activeLayer, fetchFullFeed, fetchHeatmap]);

  const handleMapMove = useCallback((center: { lat: number; lng: number }, newZoom: number) => {
    setZoom(newZoom);
    setMapCenter({ ...center, zoom: newZoom });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchFullFeed(center.lat, center.lng);
      if (activeLayer !== 'markers') {
        fetchHeatmap(center.lat, center.lng, activeLayer);
      }
    }, 350);
  }, [activeLayer, fetchFullFeed, fetchHeatmap, setMapCenter]);

  const handleLocate = async () => {
    setIsLocating(true);
    try {
      await requestLocation();
    } finally {
      setIsLocating(false);
    }
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

  const handleFarmerClick = useCallback((farmer: FarmerPoint) => {
    navigate(`/farmer/${farmer.sellerId}`);
  }, [navigate]);

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
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setSheetHeight(sheetHeight === 'collapsed' ? 'half' : 'full');
      } else {
        setSheetHeight(sheetHeight === 'full' ? 'half' : 'collapsed');
      }
    }
  };

  const formatPrice = (price: number, currency?: string) => {
    return `${price.toLocaleString()} ${currency || 'BYN'}`;
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sheet-animate { transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
        .map-animate { transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>
      
      {/* Search Header */}
      <div className="bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 py-3 z-50">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск товаров рядом..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              data-testid="input-search"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {cityName && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{cityName}</span>
            <span className="text-gray-300">•</span>
            <span className="text-blue-600 font-medium">{radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`}</span>
          </div>
        )}
      </div>

      {/* Map Section */}
      <div className={`relative map-animate ${mapHeights[sheetHeight]}`}>
        <MapContainer
          center={defaultCenter}
          zoom={zoom}
          className="w-full h-full"
          style={{ zIndex: 0 }}
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
          
          {lat && lng && (
            <>
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
            </>
          )}
          
          {activeLayer === 'markers' && clusters.map((cluster) => (
            <Marker
              key={cluster.geoHash}
              position={[cluster.lat, cluster.lng]}
              icon={cluster.isCluster ? clusterIcon(cluster.count) : adMarkerIcon}
              eventHandlers={{
                click: () => handleMarkerClick(cluster)
              }}
            />
          ))}
          
          {activeLayer === 'markers' && farmers.map((farmer) => (
            <Marker
              key={farmer.sellerId}
              position={[farmer.lat, farmer.lng]}
              icon={farmerIcon}
              eventHandlers={{
                click: () => handleFarmerClick(farmer)
              }}
            />
          ))}
          
          {activeLayer !== 'markers' && heatmapPoints.length > 0 && (
            <HeatmapLayer points={heatmapPoints} type={activeLayer} />
          )}
        </MapContainer>
        
        {/* Floating Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button
            className="w-11 h-11 rounded-full shadow-lg bg-white flex items-center justify-center active:scale-95 transition-transform"
            onClick={handleLocate}
            disabled={isLocating}
            data-testid="button-locate"
          >
            <Locate className={`w-5 h-5 ${isLocating ? 'animate-pulse text-blue-500' : 'text-gray-700'}`} />
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg p-1.5 flex flex-col gap-1">
            <button
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                activeLayer === 'markers' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveLayer('markers')}
              data-testid="button-layer-markers"
            >
              <Package className="w-4 h-4" />
            </button>
            <button
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                activeLayer === 'demand' ? 'bg-orange-500 text-white' : 'text-orange-500 hover:bg-orange-50'
              }`}
              onClick={() => setActiveLayer('demand')}
              data-testid="button-layer-demand"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                activeLayer === 'supply' ? 'bg-emerald-500 text-white' : 'text-emerald-500 hover:bg-emerald-50'
              }`}
              onClick={() => setActiveLayer('supply')}
              data-testid="button-layer-supply"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Radius Selector */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Радиус</span>
                <button
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    smartRadiusEnabled 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}
                  onClick={toggleSmartRadius}
                  data-testid="button-smart-radius"
                >
                  <Sparkles className="w-3 h-3" />
                  Smart
                </button>
              </div>
              <span className="text-base font-bold text-blue-600" data-testid="text-radius-value">
                {radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`}
              </span>
            </div>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={`flex-1 py-2 text-xs rounded-xl font-semibold transition-all ${
                    radiusKm === r 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${smartRadiusEnabled && radiusKm !== r ? 'opacity-50' : ''}`}
                  onClick={() => setRadius(r)}
                  disabled={smartRadiusEnabled}
                  data-testid={`button-radius-${r}`}
                >
                  {r < 1 ? `${r * 1000}м` : `${r}км`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      <div 
        ref={sheetRef}
        className={`bg-white rounded-t-3xl shadow-2xl sheet-animate ${sheetHeights[sheetHeight]} flex flex-col`}
        style={{ zIndex: 100 }}
      >
        {/* Sheet Handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer touch-none"
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Sheet Header */}
        <div className="px-4 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Рядом с вами</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{feed.length} объявлений</span>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => setSheetHeight(sheetHeight === 'full' ? 'half' : 'full')}
                data-testid="button-expand-sheet"
              >
                {sheetHeight === 'full' ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sheet Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* AI Hints */}
          {aiHints.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-start gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{aiHints[0]}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Trending Searches */}
          {trendingSearches.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-700">Сейчас ищут</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.slice(0, 5).map((query) => (
                  <button 
                    key={query}
                    className="px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors"
                    onClick={() => setSearchQuery(query)}
                    data-testid={`badge-trending-${query}`}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Season Highlights */}
          {seasonHighlights.length > 0 && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Leaf className="w-4 h-4 text-green-500" />
                <span className="text-sm font-semibold text-gray-700">Сезонные товары</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {seasonHighlights.map((ad) => (
                  <div 
                    key={ad._id}
                    className="flex-shrink-0 w-32 snap-start cursor-pointer"
                    onClick={() => handleAdClick(ad._id)}
                    data-testid={`card-season-${ad._id}`}
                  >
                    <div className="relative">
                      <img 
                        src={ad.photos?.[0] || '/placeholder.jpg'} 
                        alt={ad.title}
                        className="w-32 h-32 rounded-2xl object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-green-500 text-white text-xs font-medium flex items-center gap-0.5">
                        <Leaf className="w-2.5 h-2.5" />
                        Сезон
                      </div>
                    </div>
                    <p className="mt-2 text-sm font-medium line-clamp-1">{ad.title}</p>
                    <p className="text-sm font-bold text-blue-600">{formatPrice(ad.price, ad.currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Main Feed */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">Все объявления</span>
            </div>
            
            <div className="space-y-3 pb-6">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-2xl bg-gray-50 animate-pulse">
                    <div className="w-24 h-24 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 w-3/4 bg-gray-200 rounded-lg" />
                      <div className="h-5 w-1/3 bg-gray-200 rounded-lg" />
                      <div className="h-3 w-1/4 bg-gray-200 rounded-lg" />
                    </div>
                  </div>
                ))
              ) : feed.length > 0 ? (
                feed.map((ad) => (
                  <div 
                    key={ad._id}
                    className="flex gap-3 p-3 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 active:bg-gray-200/80 transition-colors"
                    onClick={() => handleAdClick(ad._id)}
                    data-testid={`card-ad-${ad._id}`}
                  >
                    <div className="relative">
                      {ad.photos?.[0] ? (
                        <img 
                          src={ad.photos[0]} 
                          alt={ad.title}
                          className="w-24 h-24 rounded-xl object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-gray-200 flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {ad.isFarmer && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <span className="text-xs">🌾</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <h4 className="font-medium text-sm text-gray-900 line-clamp-2">{ad.title}</h4>
                      <p className="text-lg font-bold text-blue-600 mt-1">
                        {formatPrice(ad.price, ad.currency)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {ad.distanceKm && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{ad.distanceKm} км</span>
                          </div>
                        )}
                        {ad.createdAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Timer className="w-3 h-3" />
                            <span>сегодня</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium">Нет объявлений рядом</p>
                  <p className="text-sm text-gray-400 mt-1">Попробуйте увеличить радиус поиска</p>
                  <button 
                    className="mt-4 px-4 py-2 rounded-xl bg-blue-500 text-white font-medium text-sm"
                    onClick={() => setRadius(Math.min(radiusKm * 2, 20))}
                    data-testid="button-increase-radius"
                  >
                    <ArrowUp className="w-4 h-4 inline mr-1" />
                    Увеличить радиус
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
