import { useNavigate } from 'react-router-dom';
import { TrendingUp, Flame, ArrowRight, Package } from 'lucide-react';
import { useTrends } from '@/hooks/useTrends';
import { useGeo } from '@/utils/geo';

interface TrendingNowProps {
  scope?: 'local' | 'country';
  limit?: number;
  className?: string;
}

export default function TrendingNow({
  scope = 'local',
  limit = 5,
  className = '',
}: TrendingNowProps) {
  const navigate = useNavigate();
  const { coords, radiusKm } = useGeo();

  const { trends, loading } = useTrends({
    lat: coords?.lat,
    lng: coords?.lng,
    radiusKm,
    limit,
    scope,
    enabled: scope === 'country' || !!coords,
  });

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 ${className}`} data-testid="trending-loading">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!trends || trends.length === 0) {
    return null;
  }

  const handleTrendClick = (trend: typeof trends[0]) => {
    navigate(`/feed?categoryId=${trend.categorySlug}`);
  };

  return (
    <div
      className={`bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden ${className}`}
      data-testid="trending-now"
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Сейчас популярно {scope === 'local' ? 'рядом' : ''}
          </h3>
        </div>

        <div className="space-y-2">
          {trends.map((trend) => (
            <button
              key={trend.id}
              onClick={() => handleTrendClick(trend)}
              className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg hover-elevate transition-all text-left"
              data-testid={`trend-item-${trend.categorySlug}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  trend.eventType === 'DEMAND_SPIKE'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}
              >
                {trend.eventType === 'DEMAND_SPIKE' ? (
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {trend.brandName || trend.categoryName}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {trend.eventType === 'DEMAND_SPIKE' ? 'Рост спроса' : 'Новые объявления'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-bold ${
                    trend.eventType === 'DEMAND_SPIKE'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  +{trend.deltaPercent}%
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
