import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceBadgeProps {
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  diffPercent: number | null | undefined;
  size?: 'sm' | 'md';
}

export default function PriceBadge({ marketLevel, diffPercent, size = 'sm' }: PriceBadgeProps) {
  if (marketLevel === 'unknown' || diffPercent === null || diffPercent === undefined) {
    return null;
  }

  const absDiff = Math.abs(diffPercent);
  
  if (marketLevel === 'fair' || absDiff < 5) {
    return null;
  }

  const getStyles = () => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: size === 'sm' ? '4px' : '6px',
      padding: size === 'sm' ? '4px 8px' : '6px 10px',
      borderRadius: '6px',
      fontSize: size === 'sm' ? '12px' : '14px',
      fontWeight: 600,
      whiteSpace: 'nowrap' as const,
    };

    if (marketLevel === 'below') {
      return {
        ...baseStyles,
        background: '#ECFDF5',
        color: '#047857',
        border: '1px solid #6EE7B7',
      };
    }

    if (marketLevel === 'above') {
      return {
        ...baseStyles,
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #FDE047',
      };
    }

    return baseStyles;
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 12 : 14;
    if (marketLevel === 'below') {
      return <TrendingDown size={iconSize} />;
    }
    if (marketLevel === 'above') {
      return <TrendingUp size={iconSize} />;
    }
    return <Minus size={iconSize} />;
  };

  const getText = () => {
    const roundedDiff = Math.round(absDiff);
    if (marketLevel === 'below') {
      return `-${roundedDiff}%`;
    }
    if (marketLevel === 'above') {
      return `+${roundedDiff}%`;
    }
    return 'По рынку';
  };

  return (
    <span style={getStyles()} data-testid="price-badge">
      {getIcon()}
      {getText()}
    </span>
  );
}
