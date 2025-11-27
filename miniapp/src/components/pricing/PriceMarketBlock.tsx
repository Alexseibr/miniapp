import PriceBadgeChip, { PriceBadge } from './PriceBadgeChip';

interface PriceMarketBlockProps {
  badge: PriceBadge | null | undefined;
  avgPrice?: number | null;
  windowDays?: number | null;
  categorySlug: string;
  price: number;
  pricePerSqm?: number | null;
}

function formatPercent(value: number): string {
  const abs = Math.abs(value);
  if (abs < 0.1) return 'менее 0.1';
  return abs.toFixed(abs >= 10 ? 0 : 1);
}

export default function PriceMarketBlock({ 
  badge, 
  avgPrice, 
  windowDays, 
  categorySlug, 
  price, 
  pricePerSqm 
}: PriceMarketBlockProps) {
  if (!badge || !badge.hasMarketData) {
    return null;
  }

  const { marketLevel, diffPercent } = badge;

  if (marketLevel === 'unknown') {
    return null;
  }

  const getStatusText = () => {
    if (marketLevel === 'below' && (diffPercent ?? 0) < 0) {
      return `Это выгоднее, чем средняя цена на похожие объявления на ${formatPercent(diffPercent!)}%.`;
    }
    if (marketLevel === 'fair') {
      return 'Цена примерно соответствует средней по рынку.';
    }
    if (marketLevel === 'above' && (diffPercent ?? 0) > 0) {
      return `Цена выше средней на ${formatPercent(diffPercent!)}%. Покупатели могут сравнить с другими объявлениями.`;
    }
    return null;
  };

  const statusText = getStatusText();

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid #E5E7EB',
      }}
      data-testid="price-market-block"
    >
      <h3 style={{
        fontSize: 24,
        fontWeight: 700,
        color: '#111827',
        margin: '0 0 20px',
      }}>
        Цена и рынок
      </h3>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 17, color: '#6B7280', marginBottom: 6 }}>
          Текущая цена
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111827' }}>
          {price.toLocaleString('ru-RU')} руб.
        </div>
        {pricePerSqm && pricePerSqm > 0 && (
          <div style={{ fontSize: 17, color: '#6B7280', marginTop: 6 }}>
            Это {pricePerSqm.toLocaleString('ru-RU')} руб./м²
          </div>
        )}
      </div>

      {avgPrice && avgPrice > 0 && (
        <div style={{
          background: '#F9FAFB',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 17, color: '#6B7280', marginBottom: 8 }}>
            Средняя цена по похожим объявлениям
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#374151' }}>
            {avgPrice.toLocaleString('ru-RU')} руб.
          </div>
          {windowDays && (
            <div style={{ fontSize: 17, color: '#9CA3AF', marginTop: 8 }}>
              Период анализа: последние {windowDays} дней
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: statusText ? 20 : 0 }}>
        <PriceBadgeChip badge={badge} size="medium" />
      </div>

      {statusText && (
        <p style={{
          fontSize: 17,
          color: '#4B5563',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {statusText}
        </p>
      )}
    </div>
  );
}
