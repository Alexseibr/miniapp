import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GeoMap, GeoFeedSheet, GeoTips } from '../components/geo-map';
import useGeoStore from '../store/useGeoStore';
import { ArrowLeft, Filter, MapPin } from 'lucide-react';

interface ClusterData {
  geoHash: string;
  lat: number;
  lng: number;
  count: number;
  avgPrice?: number;
  isCluster: boolean;
  sampleAd?: {
    title: string;
    price: number;
  };
}

export default function GeoMapPage() {
  const navigate = useNavigate();
  const { coords, cityName, radiusKm } = useGeoStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  
  const handleMarkerClick = useCallback((cluster: ClusterData) => {
    if (!cluster.isCluster && cluster.sampleAd) {
      navigate(`/ads/${cluster.geoHash}`);
    } else {
      setSheetOpen(true);
    }
  }, [navigate]);
  
  const handleAdClick = useCallback((adId: string) => {
    navigate(`/ads/${adId}`);
  }, [navigate]);
  
  const handleTipAction = useCallback((action: string, details?: unknown) => {
    if (action === 'create_ad') {
      navigate('/ads/create');
    } else if (action === 'view_feed') {
      setSheetOpen(true);
    }
  }, [navigate]);
  
  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100"
        style={{ zIndex: 1001 }}
      >
        <button
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          onClick={() => navigate(-1)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold">Карта объявлений</h1>
          {cityName && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{cityName}</span>
              <span className="text-gray-400">• {radiusKm} км</span>
            </div>
          )}
        </div>
        
        <button
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          onClick={() => setSheetOpen(true)}
          data-testid="button-filter"
        >
          <Filter className="w-5 h-5 text-gray-700" />
        </button>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative">
        <GeoMap
          onMarkerClick={handleMarkerClick}
          categoryId={selectedCategoryId}
        />
        
        {/* Geo Tips Overlay */}
        {coords && (
          <div className="absolute top-4 left-4 right-16" style={{ zIndex: 999 }}>
            <GeoTips
              role="buyer"
              onActionClick={handleTipAction}
            />
          </div>
        )}
      </div>
      
      {/* Feed Sheet */}
      <GeoFeedSheet
        isOpen={sheetOpen}
        onOpenChange={setSheetOpen}
        categoryId={selectedCategoryId}
        onAdClick={handleAdClick}
      />
    </div>
  );
}
