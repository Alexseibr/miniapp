import { PlusCircle, Loader2, MapPin } from 'lucide-react';
import AdCardSmall from './AdCardSmall';
import { AdPreview } from '@/types';

interface NearbyAdsGridProps {
  ads: AdPreview[];
  loading?: boolean;
  isEmpty?: boolean;
  hasVeryFew?: boolean;
  radiusKm?: number;
  onIncreaseRadius?: () => void;
  onSelectAd?: (ad: AdPreview) => void;
}

export default function NearbyAdsGrid({
  ads,
  loading = false,
  isEmpty = false,
  hasVeryFew = false,
  radiusKm = 5,
  onIncreaseRadius,
  onSelectAd,
}: NearbyAdsGridProps) {
  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 20px',
        }}
        data-testid="nearby-ads-loading"
      >
        <Loader2
          size={40}
          color="#3B73FC"
          style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}
        />
        <p style={{ fontSize: 16, color: '#6B7280', margin: 0 }}>
          Загружаем объявления...
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          border: '1px solid #E5E7EB',
          margin: '0 16px',
        }}
        data-testid="nearby-ads-empty"
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#EBF3FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <MapPin size={32} color="#3B73FC" />
        </div>
        <h3
          style={{
            fontSize: 20,
            fontWeight: 600,
            margin: '0 0 8px',
            color: '#111827',
          }}
        >
          Объявлений не найдено
        </h3>
        <p
          style={{
            fontSize: 16,
            color: '#6B7280',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}
        >
          В радиусе {radiusKm} км нет объявлений.
          <br />
          Попробуйте увеличить радиус поиска.
        </p>
        {onIncreaseRadius && (
          <button
            onClick={onIncreaseRadius}
            style={{
              padding: '16px 28px',
              background: '#3B73FC',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              minHeight: 52,
            }}
            data-testid="button-increase-radius-grid"
          >
            <PlusCircle size={22} />
            Увеличить радиус (+5 км)
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '0 12px 24px' }}>
      {hasVeryFew && onIncreaseRadius && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <p style={{ fontSize: 14, color: '#92400E', margin: 0, lineHeight: 1.4 }}>
            Нашли мало объявлений ({ads.length}) в радиусе {radiusKm} км.{' '}
            <button
              onClick={onIncreaseRadius}
              style={{
                background: 'none',
                border: 'none',
                color: '#B45309',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                padding: 0,
              }}
            >
              Увеличить радиус →
            </button>
          </p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
        className="nearby-ads-grid"
        data-testid="nearby-ads-grid"
      >
        {ads.map((ad) => (
          <AdCardSmall key={ad._id} ad={ad} onSelect={onSelectAd} />
        ))}
      </div>

      {ads.length > 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#9CA3AF',
            marginTop: 16,
          }}
        >
          Показано {ads.length} {getAdsWord(ads.length)}
        </p>
      )}
    </div>
  );
}

function getAdsWord(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return 'объявлений';
  }
  if (lastOne === 1) {
    return 'объявление';
  }
  if (lastOne >= 2 && lastOne <= 4) {
    return 'объявления';
  }
  return 'объявлений';
}
