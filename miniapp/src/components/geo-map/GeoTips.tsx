import { useState, useEffect, useCallback } from 'react';
import useGeoStore from '../../store/useGeoStore';
import { TrendingUp, Lightbulb, X, ChevronRight, MapPin, ShoppingBag } from 'lucide-react';

interface GeoRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  details?: {
    query?: string;
    count?: number;
    queries?: string[];
    ads?: Array<{ id: string; title: string; price: number }>;
  };
  action?: string;
}

interface GeoTipsProps {
  role?: 'buyer' | 'seller' | 'farmer';
  className?: string;
  onActionClick?: (action: string, details?: GeoRecommendation['details']) => void;
}

export function GeoTips({ role = 'buyer', className = '', onActionClick }: GeoTipsProps) {
  const { coords } = useGeoStore();
  const lat = coords?.lat;
  const lng = coords?.lng;
  
  const [recommendations, setRecommendations] = useState<GeoRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  
  const fetchRecommendations = useCallback(async () => {
    if (!lat || !lng) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/geo-intelligence/recommendations?lat=${lat}&lng=${lng}&role=${role}`
      );
      const data = await response.json();
      if (data.success) {
        setRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error('Failed to fetch geo recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, role]);
  
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);
  
  const handleDismiss = (index: number) => {
    setDismissed(prev => [...prev, String(index)]);
  };
  
  const handleAction = (rec: GeoRecommendation) => {
    onActionClick?.(rec.action || rec.type, rec.details);
  };
  
  const visibleRecs = recommendations.filter((_, i) => !dismissed.includes(String(i)));
  
  if (loading || visibleRecs.length === 0) return null;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'demand_opportunity':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      case 'unmet_demand':
        return <ShoppingBag className="w-4 h-4 text-purple-500" />;
      case 'new_nearby':
        return <MapPin className="w-4 h-4 text-green-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
    }
  };
  
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-orange-300 bg-orange-50';
      case 'medium':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };
  
  return (
    <div className={`space-y-2 ${className}`}>
      {visibleRecs.slice(0, 3).map((rec, index) => (
        <div
          key={`${rec.type}-${index}`}
          className={`relative p-3 rounded-xl border transition-all ${getPriorityStyles(rec.priority)}`}
          data-testid={`tip-${rec.type}`}
        >
          <button
            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/50"
            onClick={() => handleDismiss(index)}
            data-testid={`button-dismiss-tip-${index}`}
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
          
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5">{getIcon(rec.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800">{rec.message}</p>
              
              {rec.details?.queries && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {rec.details.queries.slice(0, 3).map((q: string) => (
                    <span 
                      key={q} 
                      className="inline-block px-2 py-0.5 rounded-full bg-white text-xs text-gray-600"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}
              
              {rec.action && (
                <button
                  className="mt-2 inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => handleAction(rec)}
                  data-testid={`button-action-${rec.action}`}
                >
                  {rec.action === 'create_ad' ? 'Подать объявление' : 'Посмотреть'}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GeoTips;
