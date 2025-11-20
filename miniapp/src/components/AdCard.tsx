import React from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from './FavoriteButton';
import { AdPreview } from '@/types';
import { formatDistance } from '@/utils/geo';
import { formatRelativeTime } from '@/utils/time';
import { useCartStore } from '@/store/cart';

interface Props {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
}

export default function AdCard({ ad, onSelect }: Props) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      adId: ad._id,
      title: ad.title,
      price: ad.price,
      quantity: 1,
      sellerTelegramId: ad.sellerTelegramId,
      photo: ad.photos?.[0],
    });
  };

  const handleDetails = (event: React.MouseEvent) => {
    if (onSelect) {
      event.preventDefault();
      onSelect(ad);
    }
  };

  return (
    <article className="card" style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to={`/ads/${ad._id}`} onClick={handleDetails} style={{ fontWeight: 600 }}>
            {ad.title}
          </Link>
          <FavoriteButton adId={ad._id} />
        </div>
        <p style={{ margin: '4px 0', color: '#475467', fontSize: '0.9rem' }}>
          {ad.categoryId}
          {ad.subcategoryId ? ` / ${ad.subcategoryId}` : ''}
        </p>
        <p style={{ margin: '8px 0', color: '#475467' }}>
          {(ad.description || 'Описание появится позже').slice(0, 140)}
          {ad.description && ad.description.length > 140 ? '…' : ''}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 600 }}>
          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
        </p>
        {ad.distanceKm != null && (
          <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#64748b' }}>
            {formatDistance(ad.distanceKm)} от вас
          </p>
        )}
        {ad.createdAt && (
          <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
            Опубликовано {formatRelativeTime(ad.createdAt)}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {ad.deliveryType && ad.deliveryType !== 'pickup_only' && (
            <span className="badge" style={{ background: '#ecfeff', color: '#0ea5e9' }}>
              🚚 Доставка
            </span>
          )}
          {ad.isLiveSpot && (
            <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
              📍 На ярмарке
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" className="secondary" onClick={handleAddToCart}>
            Добавить в корзину
          </button>
          <button type="button" className="secondary" onClick={handleDetails}>
            Подробнее
          </button>
          <a
            className="secondary"
            href={`tg://user?id=${ad.sellerTelegramId}`}
            style={{ textAlign: 'center', textDecoration: 'none', lineHeight: '42px' }}
          >
            Написать продавцу
          </a>
        </div>
      </div>
    </article>
  );
}
