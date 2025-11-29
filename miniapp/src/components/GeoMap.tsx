import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type SellerType = 'farmer' | 'store' | 'private';

interface Ad {
  _id: string;
  title: string;
  price: number;
  currency?: string;
  photos?: string[];
  distanceKm?: number;
  categoryId?: string;
  isFarmerAd?: boolean;
  location?: { lat: number; lng: number };
}

interface GeoMapProps {
  lat: number;
  lng: number;
  radiusKm: number;
  feed: Ad[];
  selectedAdId: string | null;
  onMarkerClick: (adId: string) => void;
  onMapMove: (lat: number, lng: number) => void;
}

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
    farmer: `<path d="M16 8c-2 0-4 2-4 5s2 6 4 6 4-3 4-6-2-5-4-5z" fill="white" opacity="0.9"/>`,
    store: `<rect x="11" y="12" width="10" height="7" rx="1" fill="white"/>`
  };
  
  const c = colors[type];
  const scale = isSelected ? 1.15 : 1;
  
  return L.divIcon({
    className: 'ketmar-marker',
    html: `
      <div style="transform: scale(${scale}); transition: transform 150ms; filter: drop-shadow(0 4px 8px ${c.shadow});">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <defs>
            <linearGradient id="pin-${type}-${isSelected}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="${c.from}"/>
              <stop offset="100%" stop-color="${c.to}"/>
            </linearGradient>
          </defs>
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="url(#pin-${type}-${isSelected})"/>
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

function MapController({ 
  center, 
  onMove 
}: { 
  center: [number, number];
  onMove: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const initializedRef = useRef(false);
  
  useEffect(() => {
    if (!initializedRef.current && center[0] !== 0 && center[1] !== 0) {
      map.setView(center, 14);
      initializedRef.current = true;
    }
  }, [center, map]);
  
  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      onMove(c.lat, c.lng);
    }
  });
  
  return null;
}

export default function GeoMap({ lat, lng, radiusKm, feed, selectedAdId, onMarkerClick, onMapMove }: GeoMapProps) {
  const center: [number, number] = [lat, lng];
  
  return (
    <>
      <style>{`
        @keyframes userPulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
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
      
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} onMove={onMapMove} />
        
        {/* User location */}
        <Marker position={center} icon={userIcon} />
        
        {/* Radius circle */}
        <Circle
          center={center}
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
        {feed.map((ad, index) => {
          const adLat = ad.location?.lat || lat + (Math.random() - 0.5) * 0.02;
          const adLng = ad.location?.lng || lng + (Math.random() - 0.5) * 0.02;
          const type = getSellerType(ad);
          const isSelected = ad._id === selectedAdId;
          
          return (
            <Marker
              key={`${ad._id}-${index}`}
              position={[adLat, adLng]}
              icon={createMarkerIcon(type, isSelected)}
              eventHandlers={{
                click: () => onMarkerClick(ad._id)
              }}
            />
          );
        })}
      </MapContainer>
    </>
  );
}
