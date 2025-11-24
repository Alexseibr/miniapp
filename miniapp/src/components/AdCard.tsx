import { useNavigate } from 'react-router-dom';
import { Heart, Truck, MapPin } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { AdPreview } from '@/types';
import { formatCityDistance } from '@/utils/geo';
import { formatRelativeTime } from '@/utils/time';
import { useCartStore } from '@/store/cart';

interface AdCardProps {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
  showActions?: boolean;
}

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='20' font-family='Inter, sans-serif'>Нет фото</text></svg>";

export default function AdCard({ ad, onSelect, showActions = true }: AdCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  
  const previewImage = (ad.photos && ad.photos.length > 0 ? ad.photos[0] : null) || NO_PHOTO_PLACEHOLDER;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(ad);
    } else {
      navigate(`/ads/${ad._id}`);
    }
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();
    addItem({
      adId: ad._id,
      title: ad.title,
      price: ad.price,
      quantity: 1,
      sellerTelegramId: ad.sellerTelegramId,
      photo: ad.photos && ad.photos.length > 0 ? ad.photos[0] : undefined,
    });
  };

  const handleContactSeller = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <article
      className="card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      data-testid={`ad-card-${ad._id}`}
      style={{
        cursor: 'pointer',
        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
        <img
          src={previewImage}
          alt={ad.title}
          loading="lazy"
          decoding="async"
          data-testid={`ad-image-${ad._id}`}
          style={{
            width: '100%',
            height: '200px',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
          }}
        >
          <FavoriteButton adId={ad._id} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3
          data-testid={`ad-title-${ad._id}`}
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: '1.4',
          }}
        >
          {ad.title}
        </h3>

        <p
          data-testid={`ad-category-${ad._id}`}
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--color-secondary)',
          }}
        >
          {ad.categoryId}
          {ad.subcategoryId ? ` / ${ad.subcategoryId}` : ''}
        </p>

        {ad.description && (
          <p
            data-testid={`ad-description-${ad._id}`}
            style={{
              margin: 0,
              fontSize: '14px',
              color: 'var(--color-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.4',
            }}
          >
            {ad.description.slice(0, 100)}
            {ad.description.length > 100 ? '…' : ''}
          </p>
        )}

        <p
          data-testid={`ad-price-${ad._id}`}
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
        </p>

        {(ad.city || ad.distanceKm != null) && (
          <p
            data-testid={`ad-location-${ad._id}`}
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--color-secondary-light)',
            }}
          >
            {formatCityDistance(ad.city, ad.distanceKm)}
          </p>
        )}

        {ad.createdAt && (
          <p
            data-testid={`ad-time-${ad._id}`}
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--color-secondary-light)',
            }}
          >
            Опубликовано {formatRelativeTime(ad.createdAt)}
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          {ad.deliveryType && ad.deliveryType !== 'pickup_only' && (
            <span
              className="badge"
              data-testid={`ad-delivery-badge-${ad._id}`}
              style={{
                background: 'var(--color-info-bg)',
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Truck size={14} />
              Доставка
            </span>
          )}
          {ad.isLiveSpot && (
            <span
              className="badge"
              data-testid={`ad-livespot-badge-${ad._id}`}
              style={{
                background: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MapPin size={14} />
              На ярмарке
            </span>
          )}
        </div>

        {showActions && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary"
              onClick={handleAddToCart}
              data-testid={`button-add-to-cart-${ad._id}`}
              style={{ flex: 1, minWidth: '140px' }}
            >
              В корзину
            </button>
            <a
              className="secondary"
              href={`tg://user?id=${ad.sellerTelegramId}`}
              onClick={handleContactSeller}
              data-testid={`button-contact-seller-${ad._id}`}
              style={{
                flex: 1,
                minWidth: '140px',
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Продавцу
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
