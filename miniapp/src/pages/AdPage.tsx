import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAd } from '@/api/ads';
import EmptyState from '@/widgets/EmptyState';
import { AdPreview } from '@/types';
import FavoriteButton from '@/components/FavoriteButton';
import { useCartStore } from '@/store/cart';

export default function AdPage() {
  const { id } = useParams();
  const [ad, setAd] = useState<AdPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!id) return;
    getAd(id)
      .then(setAd)
      .catch(() => setAd(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <EmptyState title="Загружаем объявление" />;
  }

  if (!ad) {
    return <EmptyState title="Объявление не найдено" description="Возможно, оно было удалено продавцом" />;
  }

  return (
    <div className="container">
      <article className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{ad.title}</h2>
          <FavoriteButton adId={ad._id} />
        </div>
        <p style={{ color: '#475467' }}>{ad.description}</p>
        {ad.photos?.length && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px 0' }}>
            {ad.photos.map((photo) => (
              <img
                key={photo}
                src={photo}
                alt={ad.title}
                style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 12 }}
              />
            ))}
          </div>
        )}
        <p style={{ fontSize: '1.8rem', fontWeight: 700 }}>
          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
        </p>
        {ad.attributes && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', color: '#475467' }}>
            {Object.entries(ad.attributes).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="primary" href={`tg://user?id=${ad.sellerTelegramId}`} style={{ textAlign: 'center', textDecoration: 'none' }}>
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
        </div>
      </article>
    </div>
  );
}
