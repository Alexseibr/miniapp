import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useGeoStore from '../../store/useGeoStore';
import { Locate, Layers, TrendingUp, Package } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const RADIUS_OPTIONS = [0.3, 1, 3, 5, 10, 20];

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div style="position: relative;">
      <div style="position: absolute; width: 32px; height: 32px; background: rgba(59, 130, 246, 0.3); border-radius: 50%; animation: ping 1s infinite;"></div>
      <div style="position: relative; width: 16px; height: 16px; background: #2563EB; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const adMarkerIcon = L.divIcon({
  className: 'ad-marker',
  html: `
    <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #34D399, #10B981); border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 10px; font-weight: bold;">K</span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const clusterIcon = (count: number) => L.divIcon({
  className: 'cluster-marker',
  html: `
    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #FB923C, #EA580C); border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 12px; font-weight: bold;">${count > 99 ? '99+' : count}</span>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  count: number;
}

interface ClusterData {
  geoHash: string;
  lat: number;
  lng: number;
  count: number;
  avgPrice?: number;
  isCluster: boolean;
  adId?: string;
  sampleAd?: {
    id?: string;
    title: string;
    price: number;
  };
}

interface GeoMapProps {
  onMarkerClick?: (cluster: ClusterData) => void;
  onMapMove?: (center: { lat: number; lng: number }, zoom: number) => void;
  showHeatmap?: boolean;
  heatmapType?: 'demand' | 'supply';
  categoryId?: string;
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
        ? `rgba(255, ${Math.round(100 + (1 - point.intensity) * 155)}, 0, ${0.3 + point.intensity * 0.4})`
        : `rgba(0, ${Math.round(100 + point.intensity * 155)}, 255, ${0.3 + point.intensity * 0.4})`;
      
      const radius = 100 + point.intensity * 200;
      
      L.circle([point.lat, point.lng], {
        radius,
        color: 'transparent',
        fillColor: color,
        fillOpacity: 0.6
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

export function GeoMap({ 
  onMarkerClick, 
  onMapMove, 
  heatmapType = 'supply',
  categoryId 
}: GeoMapProps) {
  const { coords, radiusKm, setRadius, requestLocation } = useGeoStore();
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [zoom, setZoom] = useState(13);
  const [isLocating, setIsLocating] = useState(false);
  const [activeLayer, setActiveLayer] = useState<'markers' | 'demand' | 'supply'>('markers');
  const debounceRef = useRef<NodeJS.Timeout>();
  
  const defaultCenter: [number, number] = [lat || 53.9, lng || 27.5667];
  
  const fetchClusters = useCallback(async (centerLat: number, centerLng: number, currentZoom: number) => {
    try {
      const response = await fetch(
        `/api/geo-intelligence/clusters?lat=${centerLat}&lng=${centerLng}&radiusKm=${radiusKm}&zoom=${currentZoom}${categoryId ? `&categoryId=${categoryId}` : ''}`
      );
      const data = await response.json();
      if (data.success) {
        setClusters(data.data.clusters);
      }
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
    }
  }, [radiusKm, categoryId]);
  
  const fetchHeatmap = useCallback(async (centerLat: number, centerLng: number, type: 'demand' | 'supply') => {
    try {
      const endpoint = type === 'demand' ? 'heatmap/demand' : 'heatmap/supply';
      const response = await fetch(
        `/api/geo-intelligence/${endpoint}?lat=${centerLat}&lng=${centerLng}&radiusKm=${radiusKm}${categoryId ? `&categoryId=${categoryId}` : ''}`
      );
      const data = await response.json();
      if (data.success) {
        setHeatmapPoints(data.data.points);
      }
    } catch (error) {
      console.error('Failed to fetch heatmap:', error);
    }
  }, [radiusKm, categoryId]);
  
  useEffect(() => {
    if (lat && lng) {
      fetchClusters(lat, lng, zoom);
      if (activeLayer !== 'markers') {
        fetchHeatmap(lat, lng, activeLayer);
      }
    }
  }, [lat, lng, zoom, activeLayer, fetchClusters, fetchHeatmap]);
  
  const handleMapMove = useCallback((center: { lat: number; lng: number }, newZoom: number) => {
    setZoom(newZoom);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchClusters(center.lat, center.lng, newZoom);
      if (activeLayer !== 'markers') {
        fetchHeatmap(center.lat, center.lng, activeLayer);
      }
      onMapMove?.(center, newZoom);
    }, 300);
  }, [activeLayer, fetchClusters, fetchHeatmap, onMapMove]);
  
  const handleLocate = async () => {
    setIsLocating(true);
    try {
      await requestLocation();
    } finally {
      setIsLocating(false);
    }
  };
  
  const handleLayerChange = (layer: 'markers' | 'demand' | 'supply') => {
    setActiveLayer(layer);
    if (layer !== 'markers' && lat && lng) {
      fetchHeatmap(lat, lng, layer);
    }
  };
  
  return (
    <div className="relative w-full h-full" style={{ minHeight: '400px' }}>
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .leaflet-container {
          width: 100%;
          height: 100%;
          min-height: 400px;
          z-index: 0;
        }
      `}</style>
      
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        className="w-full h-full"
        style={{ zIndex: 0, width: '100%', height: '100%', minHeight: '400px' }}
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
        
        {lat && lng && (
          <>
            <Marker position={[lat, lng]} icon={userIcon} />
            <Circle
              center={[lat, lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 10'
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
              click: () => onMarkerClick?.(cluster)
            }}
          />
        ))}
        
        {activeLayer !== 'markers' && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} type={activeLayer} />
        )}
      </MapContainer>
      
      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ zIndex: 1000 }}>
        <button
          className="w-12 h-12 rounded-full shadow-lg bg-white flex items-center justify-center"
          onClick={handleLocate}
          disabled={isLocating}
          data-testid="button-locate"
        >
          <Locate className={`w-5 h-5 ${isLocating ? 'animate-pulse text-blue-500' : 'text-gray-700'}`} />
        </button>
        
        <div className="bg-white rounded-xl shadow-lg p-1 flex flex-col gap-1">
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeLayer === 'markers' ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
            onClick={() => handleLayerChange('markers')}
            data-testid="button-layer-markers"
          >
            <Package className="w-4 h-4" />
          </button>
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeLayer === 'demand' ? 'bg-orange-500 text-white' : 'text-orange-500'}`}
            onClick={() => handleLayerChange('demand')}
            data-testid="button-layer-demand"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeLayer === 'supply' ? 'bg-blue-500 text-white' : 'text-blue-500'}`}
            onClick={() => handleLayerChange('supply')}
            data-testid="button-layer-supply"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Radius Selector */}
      <div className="absolute bottom-4 left-4 right-4" style={{ zIndex: 1000 }}>
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Радиус поиска</span>
            <span className="text-lg font-bold text-blue-600" data-testid="text-radius-value">
              {radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`}
            </span>
          </div>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                className={`flex-1 py-2 px-1 text-xs rounded-lg font-medium transition-colors ${
                  radiusKm === r 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setRadius(r)}
                data-testid={`button-radius-${r}`}
              >
                {r < 1 ? `${r * 1000}м` : `${r}км`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeoMap;
