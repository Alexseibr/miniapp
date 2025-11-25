import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { PriceBadge } from './PriceBadgeChip';

interface PriceHintForSellerProps {
  badge: PriceBadge | null | undefined;
  avgPrice?: number | null;
  windowDays?: number | null;
  price: number;
}

function formatPercent(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.1) return 'менее 0.1';
  return abs.toFixed(abs >= 10 ? 0 : 1);
}

export default function PriceHintForSeller({ 
  badge, 
  avgPrice, 
  windowDays, 
  price 
}: PriceHintForSellerProps) {
  if (!badge || !badge.hasMarketData || !avgPrice || avgPrice <= 0) {
    return (
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: '#F9FAFB',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
        data-testid="price-hint-no-data"
      >
        <Info size={16} style={{ color: '#9CA3AF', flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>
          Пока недостаточно данных для анализа цены.
        </span>
      </div>
    );
  }

  const { marketLevel, diffPercent } = badge;

  if (marketLevel === 'unknown') {
    return null;
  }

  const getConfig = () => {
    if (marketLevel === 'below') {
      return {
        bg: '#ECFDF5',
        border: '#BBF7D0',
        icon: TrendingDown,
        iconColor: '#16A34A',
        mainText: `Средняя цена на похожие объявления: ${avgPrice.toLocaleString('ru-RU')} BYN${windowDays ? ` (за последние ${windowDays} дней)` : ''}.`,
        hintText: `Ваша цена ниже средней на ${formatPercent(diffPercent!)}%. Это может помочь продать быстрее.`,
      };
    }

    if (marketLevel === 'fair') {
      return {
        bg: '#F3F4F6',
        border: '#E5E7EB',
        icon: Minus,
        iconColor: '#6B7280',
        mainText: `Средняя цена на похожие объявления: ${avgPrice.toLocaleString('ru-RU')} BYN.`,
        hintText: 'Ваша цена примерно соответствует рынку.',
      };
    }

    if (marketLevel === 'above') {
      return {
        bg: '#FEF3C7',
        border: '#FDE68A',
        icon: TrendingUp,
        iconColor: '#D97706',
        mainText: `Средняя цена на похожие объявления: ${avgPrice.toLocaleString('ru-RU')} BYN.`,
        hintText: `Ваша цена выше средней на ${formatPercent(diffPercent!)}%. Можно снизить, чтобы привлечь больше интереса.`,
      };
    }

    return null;
  };

  const config = getConfig();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 12,
      }}
      data-testid="price-hint-for-seller"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <IconComponent 
          size={18} 
          style={{ color: config.iconColor, flexShrink: 0, marginTop: 2 }} 
        />
        <div>
          <p style={{ 
            fontSize: 13, 
            color: '#374151', 
            margin: '0 0 6px',
            lineHeight: 1.4,
          }}>
            {config.mainText}
          </p>
          <p style={{ 
            fontSize: 13, 
            color: '#4B5563', 
            margin: 0,
            lineHeight: 1.4,
            fontWeight: 500,
          }}>
            {config.hintText}
          </p>
        </div>
      </div>
    </div>
  );
}
