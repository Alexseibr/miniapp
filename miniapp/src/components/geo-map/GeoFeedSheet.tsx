import { useState, useEffect, useCallback, useRef } from 'react';
import useGeoStore from '../../store/useGeoStore';
import { ChevronUp, ChevronDown, MapPin, TrendingUp, Search } from 'lucide-react';

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

interface TrendingSearch {
  query: string;
  count: number;
  demandScore: number;
}

interface GeoFeedSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: string;
  onAdClick?: (adId: string) => void;
}

export function GeoFeedSheet({ isOpen, onOpenChange, categoryId, onAdClick }: GeoFeedSheetProps) {
  const { coords, radiusKm } = useGeoStore();
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  
  const fetchFeed = useCallback(async () => {
    if (!lat || !lng) return;
    
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    
    setLoading(true);
    try {
      const [feedRes, trendingRes] = await Promise.all([
        fetch(
          `/api/geo-intelligence/feed?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}${categoryId ? `&categoryId=${categoryId}` : ''}&limit=10`,
          { signal: abortRef.current.signal }
        ),
        fetch(
          `/api/geo-intelligence/trending-searches?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}&limit=5`,
          { signal: abortRef.current.signal }
        )
      ]);
      
      const [feedData, trendingData] = await Promise.all([
        feedRes.json(),
        trendingRes.json()
      ]);
      
      if (feedData.success) {
        setAds(feedData.data.ads);
      }
      if (trendingData.success) {
        setTrendingSearches(trendingData.data.trends);
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to fetch geo feed:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radiusKm, categoryId]);
  
  useEffect(() => {
    if (isOpen) {
      fetchFeed();
    }
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [isOpen, fetchFeed]);
  
  const formatPrice = (price: number, currency?: string) => {
    return `${price.toLocaleString()} ${currency || 'BYN'}`;
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ${
        expanded ? 'h-[80vh]' : 'h-[40vh]'
      }`}
      style={{ zIndex: 1001 }}
    >
      <div 
        className="flex justify-center py-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>
      
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Рядом с вами</h2>
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setExpanded(!expanded)}
            data-testid="button-expand-sheet"
          >
            {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
        
        {lat && lng && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>в радиусе {radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`}</span>
          </div>
        )}
      </div>
      
      <div 
        className="px-4 overflow-y-auto" 
        style={{ maxHeight: expanded ? 'calc(80vh - 100px)' : 'calc(40vh - 100px)' }}
      >
        {/* Trending Searches */}
        {trendingSearches.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Сейчас ищут</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((trend) => (
                <span 
                  key={trend.query}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm cursor-pointer hover:bg-gray-200"
                  data-testid={`badge-trending-${trend.query}`}
                >
                  <Search className="w-3 h-3 mr-1" />
                  {trend.query}
                  <span className="ml-1 text-xs text-gray-400">{trend.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Ads Feed */}
        <div className="space-y-3 pb-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 animate-pulse">
                <div className="w-20 h-20 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-5 w-1/3 bg-gray-200 rounded" />
                  <div className="h-3 w-1/4 bg-gray-200 rounded" />
                </div>
              </div>
            ))
          ) : ads.length > 0 ? (
            ads.map((ad) => (
              <div 
                key={ad._id}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors"
                onClick={() => onAdClick?.(ad._id)}
                data-testid={`card-ad-${ad._id}`}
              >
                {ad.photos?.[0] ? (
                  <img 
                    src={ad.photos[0]} 
                    alt={ad.title}
                    className="w-20 h-20 rounded-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">{ad.title}</h4>
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
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет объявлений рядом</p>
              <p className="text-sm">Попробуйте увеличить радиус поиска</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Close button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
        onClick={() => onOpenChange(false)}
        data-testid="button-close-sheet"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

export default GeoFeedSheet;
