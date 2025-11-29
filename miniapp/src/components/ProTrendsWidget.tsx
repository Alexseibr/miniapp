import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Search, ChevronRight, Flame, Loader2 } from 'lucide-react';
import { usePlatform } from '@/platform/PlatformProvider';

interface TrendEvent {
  _id: string;
  categorySlug: string;
  categoryName: string;
  citySlug: string;
  cityName: string;
  eventType: 'DEMAND_SPIKE' | 'SUPPLY_SPIKE';
  deltaPercent: number;
  period: string;
  message: string;
}

interface HotSearch {
  query: string;
  normalizedQuery: string;
  count: number;
  categoryName?: string;
}

interface ProTrendsWidgetProps {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  onAddProduct?: (categorySlug: string) => void;
  onSearchQuery?: (query: string) => void;
  isPro?: boolean;
  sellerType?: 'SHOP' | 'FARMER' | 'BLOGGER' | 'ARTISAN';
}

const SELLER_GRADIENTS = {
  SHOP: 'linear-gradient(135deg, #3B73FC 0%, #1E40AF 100%)',
  FARMER: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
  BLOGGER: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  ARTISAN: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
};

const SELLER_COLORS = {
  SHOP: '#3B73FC',
  FARMER: '#22C55E',
  BLOGGER: '#EC4899',
  ARTISAN: '#8B5CF6',
};

export default function ProTrendsWidget({
  lat,
  lng,
  radiusKm = 20,
  onAddProduct,
  onSearchQuery,
  isPro = false,
  sellerType = 'SHOP',
}: ProTrendsWidgetProps) {
  const { getAuthToken } = usePlatform();
  const [trends, setTrends] = useState<TrendEvent[]>([]);
  const [hotSearches, setHotSearches] = useState<HotSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocal, setIsLocal] = useState(false);

  const accentColor = SELLER_COLORS[sellerType];
  const gradient = SELLER_GRADIENTS[sellerType];

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setError('Требуется авторизация');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        limit: '5',
        radiusKm: String(radiusKm),
      });

      if (lat && lng) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }

      const response = await fetch(`/api/seller-analytics/trends?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }

      const data = await response.json();
      
      if (data.success) {
        setTrends(data.trends || []);
        setHotSearches(data.hotSearches || []);
        setIsLocal(data.isLocal);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setError('Не удалось загрузить тренды');
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, lat, lng, radiusKm]);

  useEffect(() => {
    if (!isPro) return;
    
    fetchTrends();
    const interval = setInterval(fetchTrends, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTrends, isPro]);

  if (!isPro) {
    return (
      <div
        data-testid="pro-trends-locked"
        style={{
          background: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)',
          borderRadius: 16,
          padding: 20,
          margin: 16,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: accentColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <TrendingUp size={28} color={accentColor} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          Аналитика трендов
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          Узнайте, что сейчас ищут покупатели в вашем районе
        </div>
        <button
          data-testid="button-upgrade-pro"
          style={{
            background: gradient,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Открыть с PRO
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        data-testid="pro-trends-loading"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 40,
          margin: 16,
          textAlign: 'center',
          border: '1px solid #E5E7EB',
        }}
      >
        <Loader2 size={32} color={accentColor} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 12, color: '#6B7280' }}>Загрузка трендов...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="pro-trends-error"
        style={{
          background: '#FEF2F2',
          borderRadius: 16,
          padding: 20,
          margin: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ color: '#DC2626', fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  const hasTrends = trends.length > 0;
  const hasHotSearches = hotSearches.length > 0;

  if (!hasTrends && !hasHotSearches) {
    return (
      <div
        data-testid="pro-trends-empty"
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 30,
          margin: 16,
          textAlign: 'center',
          border: '1px solid #E5E7EB',
        }}
      >
        <TrendingUp size={40} color="#9CA3AF" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 500, color: '#6B7280' }}>
          {isLocal ? 'Пока нет активных трендов рядом' : 'Пока нет активных трендов'}
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Данные обновляются каждые 12 часов
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="pro-trends-widget"
      style={{
        background: '#fff',
        borderRadius: 16,
        margin: 16,
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
      }}
    >
      <div
        style={{
          background: gradient,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={20} color="#fff" />
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            {isLocal ? 'Тренды рядом' : 'Тренды страны'}
          </span>
        </div>
        {isLocal && (
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 8,
            }}
          >
            {radiusKm} км
          </span>
        )}
      </div>

      {hasTrends && (
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 12 }}>
            Рост спроса
          </div>
          {trends.slice(0, 3).map((trend) => (
            <div
              key={trend._id}
              data-testid={`trend-item-${trend._id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background:
                    trend.eventType === 'DEMAND_SPIKE'
                      ? '#DCFCE7'
                      : '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp
                  size={18}
                  color={
                    trend.eventType === 'DEMAND_SPIKE' ? '#22C55E' : '#F59E0B'
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {trend.categoryName}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {trend.cityName || 'По стране'} • +{Math.round(trend.deltaPercent)}%
                </div>
              </div>
              {onAddProduct && (
                <button
                  data-testid={`button-add-trend-${trend._id}`}
                  onClick={() => onAddProduct(trend.categorySlug)}
                  style={{
                    background: accentColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Добавить
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {hasHotSearches && (
        <div style={{ padding: 16, borderTop: hasTrends ? '1px solid #E5E7EB' : 'none' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Flame size={16} color="#F97316" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>
              Горячие поиски
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hotSearches.slice(0, 6).map((search, idx) => (
              <button
                key={search.normalizedQuery || idx}
                data-testid={`hot-search-${idx}`}
                onClick={() => onSearchQuery?.(search.query)}
                style={{
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: 20,
                  padding: '8px 14px',
                  fontSize: 13,
                  color: '#374151',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Search size={14} color="#6B7280" />
                {search.query}
                <span
                  style={{
                    background: accentColor + '20',
                    color: accentColor,
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontWeight: 600,
                  }}
                >
                  {search.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
