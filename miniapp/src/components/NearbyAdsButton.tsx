import { useMemo, useState } from 'react';

import { fetchNearbyAds } from '@/services/adsApi';
import type { NearbyAd } from '@/types';

const ALLOWED_CATEGORY_IDS = new Set(['realty', 'country_base', 'farm', 'craft']);

export interface NearbyAdsButtonProps {
  categoryId?: string;
  subcategoryId?: string;
  radiusKm?: number;
}

function formatDistanceLabel(ad: NearbyAd) {
  const distanceMeters = typeof ad.distanceMeters === 'number' ? ad.distanceMeters : null;
  const distanceKmValue =
    typeof ad.distanceKm === 'number'
      ? ad.distanceKm
      : distanceMeters != null
        ? distanceMeters / 1000
        : null;

  if (distanceMeters != null && distanceMeters < 1000) {
    return `${distanceMeters} м от вас`;
  }

  if (distanceKmValue != null) {
    return `${distanceKmValue.toFixed(1)} км от вас`;
  }

  return null;
}

export function NearbyAdsButton({ categoryId, subcategoryId, radiusKm = 5 }: NearbyAdsButtonProps) {
  const [ads, setAds] = useState<NearbyAd[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCategory = useMemo(() => {
    if (categoryId && ALLOWED_CATEGORY_IDS.has(categoryId)) {
      return categoryId;
    }
    return undefined;
  }, [categoryId]);

  const handleSearch = () => {
    setError(null);

    if (!navigator.geolocation) {
      setError('Ваш браузер не поддерживает геолокацию');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const nearbyAds = await fetchNearbyAds({
            lat: coords.latitude,
            lng: coords.longitude,
            radiusKm,
            categoryId: normalizedCategory,
            subcategoryId,
          });
          setAds(nearbyAds);
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Не удалось загрузить объявления рядом',
          );
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Не удалось получить геолокацию');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className="card card--sub" style={{ marginBottom: 16 }}>
      <div className="ad-card__header" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p className="eyebrow">Быстрый поиск</p>
            <h3 className="card__title">Показать рядом со мной</h3>
            <p className="muted">Поиск объявлений в радиусе {radiusKm} км от вашей позиции</p>
          </div>
          <button type="button" className="primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Поиск…' : 'Показать рядом со мной'}
          </button>
        </div>
        {error && (
          <div className="error-box" style={{ marginTop: 4 }}>
            <p className="error-box__body">{error}</p>
          </div>
        )}
        {!error && normalizedCategory && (
          <p className="muted" style={{ marginTop: 4 }}>
            Фильтр по категории: {normalizedCategory}
          </p>
        )}
      </div>

      {loading && <p className="muted">Ищем объявления рядом…</p>}
      {!loading && ads.length === 0 && !error && (
        <p className="muted">Нажмите кнопку, чтобы увидеть объявления поблизости.</p>
      )}

      {!loading && ads.length > 0 && (
        <div className="ads-grid" style={{ marginTop: 12 }}>
          {ads.map((ad) => {
            const distanceLabel = formatDistanceLabel(ad);
            return (
              <article key={ad._id} className="card card--sub ad-card">
                <div className="ad-card__header" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <h4 className="card__title" style={{ marginRight: 12 }}>{ad.title}</h4>
                  {distanceLabel && <span className="badge">{distanceLabel}</span>}
                </div>
                {ad.description && <p className="muted">{ad.description}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
