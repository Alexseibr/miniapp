import { useState, useEffect, useRef } from 'react';
import { estimatePrice, PriceEstimateResponse } from '@/api/pricing';
import { Loader2, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface PriceHintProps {
  categoryId: string;
  subcategoryId?: string;
  price: number;
  city?: string;
}

export default function PriceHint({ categoryId, subcategoryId, price, city }: PriceHintProps) {
  const [data, setData] = useState<PriceEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCategoryRef = useRef<string>('');

  useEffect(() => {
    if (categoryId !== lastCategoryRef.current) {
      setData(null);
      setError(null);
      setLoading(false);
      lastCategoryRef.current = categoryId;
    }
    
    if (!categoryId || !price || price <= 0) {
      setData(null);
      setError(null);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await estimatePrice({
          categoryId,
          subcategoryId,
          price,
          city,
        });
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки данных');
        setData(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [categoryId, subcategoryId, price, city]);

  if (loading) {
    return (
      <div style={{
        marginTop: 16,
        padding: 16,
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }} data-testid="price-hint-loading">
        <Loader2 size={20} className="animate-spin" style={{ color: '#6B7280' }} />
        <span style={{ fontSize: 17, color: '#6B7280' }}>Анализ рынка...</span>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!data || !data.hasMarketData) {
    return null;
  }

  const { avgPrice, minPrice, maxPrice, count, windowDays, labels, diffPercent } = data;

  const getBadgeColor = () => {
    if (!labels) return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
    switch (labels.marketLevel) {
      case 'below':
        return { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' };
      case 'above':
        return { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' };
      case 'fair':
      default:
        return { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' };
    }
  };

  const getIcon = () => {
    if (!labels) return <Info size={16} />;
    switch (labels.marketLevel) {
      case 'below':
        return <TrendingDown size={16} />;
      case 'above':
        return <TrendingUp size={16} />;
      case 'fair':
      default:
        return <Minus size={16} />;
    }
  };

  const colors = getBadgeColor();

  return (
    <div style={{
      marginTop: 16,
      padding: 20,
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      borderRadius: 12,
    }} data-testid="price-hint">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ color: colors.text }}>
          {getIcon()}
        </div>
        <span style={{ 
          fontSize: 17, 
          fontWeight: 600, 
          color: colors.text,
        }} data-testid="price-hint-message">
          {labels?.messageForSeller || 'Анализ цены'}
        </span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 16,
        marginBottom: labels?.recommendedPriceRange ? 16 : 0,
      }}>
        <div>
          <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 6 }}>Средняя цена</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#111827' }} data-testid="price-hint-avg">
            {avgPrice?.toLocaleString('ru-RU')} руб.
          </div>
        </div>
        <div>
          <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 6 }}>Диапазон</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: '#374151' }} data-testid="price-hint-range">
            {minPrice?.toLocaleString('ru-RU')} – {maxPrice?.toLocaleString('ru-RU')} руб.
          </div>
        </div>
      </div>

      {labels?.recommendedPriceRange && (
        <div style={{ 
          padding: 16, 
          background: 'rgba(255,255,255,0.6)', 
          borderRadius: 10,
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 6 }}>Рекомендуемая цена</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#3B73FC' }} data-testid="price-hint-recommended">
            {labels.recommendedPriceRange.from.toLocaleString('ru-RU')} – {labels.recommendedPriceRange.to.toLocaleString('ru-RU')} руб.
          </div>
        </div>
      )}

      <div style={{ fontSize: 14, color: '#9CA3AF' }}>
        На основе {count} объявлений за {windowDays} дней
      </div>
    </div>
  );
}
