import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Truck, MapPin } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import PriceBadge from './PriceBadge';
import { AdPreview } from '@/types';
import { formatCityDistance } from '@/utils/geo';
import { formatRelativeTime } from '@/utils/time';
import { useCartStore } from '@/store/cart';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { generateSrcSet, generateAdCardSizes } from '@/utils/imageOptimization';

interface PriceBriefData {
  marketLevel: 'below' | 'fair' | 'above' | 'unknown';
  diffPercent: number | null;
}

interface AdCardProps {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
  showActions?: boolean;
  priceBrief?: PriceBriefData | null;
}

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23f1f5f9'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='20' font-family='Inter, sans-serif'>Нет фото</text></svg>";

export default function AdCard({ ad, onSelect, showActions = true, priceBrief }: AdCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const photos = ad.photos && ad.photos.length > 0 ? ad.photos : [NO_PHOTO_PLACEHOLDER];

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
      className="ad-card-compact"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      data-testid={`ad-card-${ad._id}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="ad-card-image" onClick={(e) => e.stopPropagation()}>
        <Swiper
          modules={[Pagination]}
          pagination={{ 
            clickable: true,
            dynamicBullets: true,
          }}
          style={{ width: '100%', height: '100%' }}
          onSlideChange={(swiper) => setCurrentPhotoIndex(swiper.activeIndex)}
          onClick={(swiper, e) => {
            e.stopPropagation();
          }}
          onTap={(swiper, e) => {
            e.stopPropagation();
          }}
        >
          {photos.map((photo, index) => {
            const isPlaceholder = photo.startsWith('data:');
            return (
              <SwiperSlide key={index}>
                <img
                  src={photo}
                  srcSet={!isPlaceholder ? generateSrcSet(photo) : undefined}
                  sizes={!isPlaceholder ? generateAdCardSizes() : undefined}
                  alt={`${ad.title} - фото ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  data-testid={`ad-image-${ad._id}-${index}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onClick={handleCardClick}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
        <div className="ad-card-favorite">
          <FavoriteButton adId={ad._id} />
        </div>
        {photos.length > 1 && (
          <div 
            className="ad-card-photo-counter"
            data-testid={`photo-counter-${ad._id}`}
          >
            {currentPhotoIndex + 1}/{photos.length}
          </div>
        )}
      </div>

      <div className="ad-card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <p
              data-testid={`ad-price-${ad._id}`}
              className="ad-card-price"
              style={{ margin: 0 }}
            >
              {ad.price.toLocaleString('ru-RU')} {ad.currency || 'BYN'}
            </p>
            {priceBrief && priceBrief.marketLevel !== 'unknown' && priceBrief.diffPercent !== null && (
              <PriceBadge 
                marketLevel={priceBrief.marketLevel} 
                diffPercent={priceBrief.diffPercent} 
                size="sm" 
              />
            )}
          </div>
          {ad.createdAt && (
            <span
              data-testid={`ad-date-${ad._id}`}
              style={{
                fontSize: '0.625rem',
                color: 'var(--color-secondary)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              {formatRelativeTime(new Date(ad.createdAt))}
            </span>
          )}
        </div>

        <h3
          data-testid={`ad-title-${ad._id}`}
          className="ad-card-title"
        >
          {ad.title}
        </h3>

        {(ad.city || ad.distanceKm != null) && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              marginTop: '4px'
            }}
          >
            <MapPin 
              size={12} 
              style={{ 
                color: ad.distanceKm != null ? '#10b981' : 'var(--color-secondary)', 
                flexShrink: 0 
              }} 
            />
            <p
              data-testid={`ad-location-${ad._id}`}
              className="ad-card-location"
              style={{ margin: 0 }}
            >
              {formatCityDistance(ad.city, ad.distanceKm)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
