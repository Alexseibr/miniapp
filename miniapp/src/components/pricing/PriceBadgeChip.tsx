import { TrendingUp, TrendingDown, Equal } from 'lucide-react';

export interface PriceBadge {
  hasMarketData: boolean;
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  diffPercent?: number | null;
}

interface PriceBadgeChipProps {
  badge: PriceBadge | null | undefined;
  size?: 'small' | 'medium';
}

function formatPercent(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.1) return 'менее 0.1';
  return abs.toFixed(abs >= 10 ? 0 : 1);
}

export default function PriceBadgeChip({ badge, size = 'small' }: PriceBadgeChipProps) {
  if (!badge || !badge.hasMarketData) {
    return null;
  }

  const { marketLevel, diffPercent } = badge;

  if (marketLevel === 'unknown') {
    return null;
  }

  const absDiff = Math.abs(diffPercent ?? 0);

  const getConfig = () => {
    if (marketLevel === 'below' && (diffPercent ?? 0) <= -3) {
      return {
        bg: '#ECFDF5',
        text: '#047857',
        border: '#6EE7B7',
        icon: TrendingDown,
        label: `Ниже рынка на ${formatPercent(diffPercent!)}%`,
      };
    }

    if (marketLevel === 'above' && (diffPercent ?? 0) >= 5) {
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FDE047',
        icon: TrendingUp,
        label: `Выше рынка на ${formatPercent(diffPercent!)}%`,
      };
    }

    if (marketLevel === 'fair' || absDiff < 3) {
      return {
        bg: '#F3F4F6',
        text: '#4B5563',
        border: '#D1D5DB',
        icon: Equal,
        label: 'Цена по рынку',
      };
    }

    return null;
  };

  const config = getConfig();
  if (!config) return null;

  const IconComponent = config.icon;
  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 4 : 8,
        padding: isSmall ? '3px 10px' : '8px 16px',
        borderRadius: 9999,
        fontSize: isSmall ? 12 : 18,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
      data-testid="price-badge-chip"
    >
      <IconComponent size={isSmall ? 14 : 20} />
      {config.label}
    </span>
  );
}
