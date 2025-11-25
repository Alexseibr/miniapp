import { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import http from '@/api/http';

interface PriceComparison {
  status: 'below_market' | 'above_market' | 'at_market' | 'insufficient_data';
  percent?: number;
  message: string;
  color: string;
  icon: string;
}

interface PriceComparisonBadgeProps {
  adId: string;
  inline?: boolean;
}

export default function PriceComparisonBadge({ adId, inline = false }: PriceComparisonBadgeProps) {
  const [comparison, setComparison] = useState<PriceComparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get(`/api/analytics/ad/${adId}/compare`)
      .then(({ data }) => setComparison(data))
      .catch(() => setComparison(null))
      .finally(() => setLoading(false));
  }, [adId]);

  if (loading) {
    if (inline) return null;
    return (
      <div style={{
        padding: '8px 12px',
        background: '#F3F4F6',
        borderRadius: 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 13, color: '#6B7280' }}>Анализируем...</span>
      </div>
    );
  }

  if (!comparison || comparison.status === 'insufficient_data') {
    return null;
  }

  const getIcon = () => {
    switch (comparison.status) {
      case 'below_market':
        return <TrendingDown size={inline ? 14 : 16} />;
      case 'above_market':
        return <TrendingUp size={inline ? 14 : 16} />;
      default:
        return <Minus size={inline ? 14 : 16} />;
    }
  };

  const getBgColor = () => {
    switch (comparison.status) {
      case 'below_market':
        return 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)';
      case 'above_market':
        return 'linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%)';
      default:
        return 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)';
    }
  };

  const getTextColor = () => {
    switch (comparison.status) {
      case 'below_market':
        return '#059669';
      case 'above_market':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  if (inline) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: getBgColor(),
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color: getTextColor(),
      }}>
        {getIcon()}
        {comparison.message}
      </span>
    );
  }

  return (
    <div style={{
      padding: '12px 16px',
      background: getBgColor(),
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: comparison.status === 'below_market' 
          ? '#10B981' 
          : comparison.status === 'above_market' 
            ? '#EF4444' 
            : '#9CA3AF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
      }}>
        {getIcon()}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: getTextColor() }}>
          {comparison.message}
        </div>
        {comparison.percent && comparison.percent > 0 && (
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            На основе анализа {comparison.percent > 20 ? 'похожих' : 'аналогичных'} объявлений
          </div>
        )}
      </div>
    </div>
  );
}
