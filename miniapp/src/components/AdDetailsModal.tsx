import { useEffect, useState } from 'react';
import { MapPin, Truck } from 'lucide-react';
import { getAd } from '@/api/ads';
import { Ad } from '@/types';
import { useCartStore } from '@/store/cart';
import FavoriteButton from './FavoriteButton';
import { getThumbnailUrl } from '@/constants/placeholders';

interface Props {
  adId: string | null;
  onClose: () => void;
}

export default function AdDetailsModal({ adId, onClose }: Props) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!adId) return;
    setLoading(true);
    getAd(adId)
      .then(setAd)
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [adId]);

  if (!adId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <p>Загружаем объявление…</p>
        ) : !ad ? (
          <p>Не удалось загрузить объявление.</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{ad.title}</h3>
              <FavoriteButton adId={ad._id} />
            </div>
            <p style={{ color: '#475467' }}>{ad.description || 'Описание появится позже'}</p>

            {ad.photos?.length ? (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px 0' }}>
                {ad.photos.map((photo) => (
                  <img
                    key={photo}
                    src={getThumbnailUrl(photo)}
                    alt={ad.title}
                    loading="lazy"
                    style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 12 }}
                  />
                ))}
              </div>
            ) : null}

            <p style={{ fontSize: '1.6rem', fontWeight: 700, margin: '12px 0' }}>
              {ad.price.toLocaleString('ru-RU')} руб.
            </p>

            {ad.attributes && Object.keys(ad.attributes).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 6px' }}>Характеристики</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#475467' }}>
                  {Object.entries(ad.attributes).map(([key, value]) => (
                    <li key={key} style={{ marginBottom: 4 }}>
                      <strong>{key}:</strong> {String(value)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ad.deliveryType && ad.deliveryType !== 'pickup_only' && (
              <div className="badge" style={{ alignSelf: 'flex-start', marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Truck size={14} />
                Доставка {ad.deliveryRadiusKm ? `в радиусе ${ad.deliveryRadiusKm} км` : ''}
              </div>
            )}

            {ad.isLiveSpot && (
              <div className="badge" style={{ alignSelf: 'flex-start', background: '#ecfeff', color: '#0ea5e9', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={14} />
                На ярмарке сейчас
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <a
                className="primary"
                href={`tg://user?id=${ad.sellerTelegramId}`}
                style={{ textAlign: 'center', textDecoration: 'none' }}
              >
                Написать продавцу
              </a>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  addItem({
                    adId: ad._id,
                    title: ad.title,
                    price: ad.price,
                    quantity: 1,
                    sellerTelegramId: ad.sellerTelegramId,
                    photo: ad.photos?.[0],
                  })
                }
              >
                Добавить в корзину
              </button>
              <button type="button" className="secondary" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
