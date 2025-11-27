import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Package } from 'lucide-react';
import { useUserStore, useIsFavorite } from '@/store/useUserStore';
import { AdPreview, PriceBadgeData } from '@/types';
import { formatCityDistance } from '@/utils/geo';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { trackImpression } from '@/api/ads';
import { NO_PHOTO_PLACEHOLDER, getThumbnailUrl } from '@/constants/placeholders';

interface AdCardProps {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
  showActions?: boolean;
  priceBrief?: PriceBadgeData | null;
}

export default function AdCard({ ad, onSelect }: AdCardProps) {
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const toggleFavorite = useUserStore((state) => state.toggleFavorite);
  const isFavorite = useIsFavorite(ad._id);
  const [pending, setPending] = useState(false);
  
  const rawPhotos = ad.photos && ad.photos.length > 0 ? ad.photos : [];
  const photos = rawPhotos.length > 0 
    ? rawPhotos.map(p => getThumbnailUrl(p)) 
    : [NO_PHOTO_PLACEHOLDER];

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    let hasTracked = false;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked) {
            visibilityTimer = setTimeout(() => {
              if (!hasTracked) {
                trackImpression(ad._id);
                hasTracked = true;
                observer.unobserve(element);
              }
            }, 1000);
          } else if (!entry.isIntersecting && visibilityTimer) {
            clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    return () => {
      if (visibilityTimer) {
        clearTimeout(visibilityTimer);
      }
      observer.disconnect();
    };
  }, [ad._id]);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(ad);
    } else {
      navigate(`/ads/${ad._id}`);
    }
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await toggleFavorite(ad._id);
    } finally {
      setPending(false);
    }
  };

  const isFree = ad.price === 0;

  return (
    <article
      ref={cardRef}
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
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {/* Image Container */}
      <div 
        style={{
          position: 'relative',
          aspectRatio: '1',
          background: '#F5F6F8',
          overflow: 'hidden',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
                {!isPlaceholder ? (
                  <img
                    src={photo}
                    srcSet={generateSrcSet(photo)}
                    sizes={generateAdCardSizes()}
                    alt={`${ad.title} - фото ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    data-testid={`ad-image-${ad._id}-${index}`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                    }}
                    onClick={handleCardClick}
                  />
                ) : (
                  <div 
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#F5F6F8',
                    }}
                    onClick={handleCardClick}
                  >
                    <Package size={32} color="#9CA3AF" />
                  </div>
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>
        
        {/* Favorite Button - Heart in circle */}
        <button
          onClick={handleFavoriteClick}
          disabled={pending}
          data-testid={`button-favorite-${ad._id}`}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            width: 32,
            height: 32,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: pending ? 'wait' : 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Heart
            size={18}
            fill={isFavorite ? '#EF4444' : 'none'}
            color={isFavorite ? '#EF4444' : '#9CA3AF'}
            strokeWidth={2}
          />
        </button>
        
        {/* Photo Counter */}
        {photos.length > 1 && (
          <div 
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '4px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 500,
              color: '#FFFFFF',
              zIndex: 10,
            }}
            data-testid={`photo-counter-${ad._id}`}
          >
            {currentPhotoIndex + 1}/{photos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 4px 8px' }}>
        {/* Price */}
        <p
          data-testid={`ad-price-${ad._id}`}
          style={{ 
            margin: '0 0 4px',
            fontSize: 16,
            fontWeight: 700,
            color: '#1F2937',
          }}
        >
          {isFree ? 'Даром' : `${ad.price.toLocaleString('ru-RU')} руб.`}
        </p>

        {/* Title */}
        <h3
          data-testid={`ad-title-${ad._id}`}
          style={{
            margin: '0 0 4px',
            fontSize: 13,
            fontWeight: 400,
            color: '#6B7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          {ad.title}
        </h3>

        {/* Location */}
        {ad.city && (
          <p
            data-testid={`ad-location-${ad._id}`}
            style={{ 
              margin: 0,
              fontSize: 12,
              color: '#9CA3AF',
            }}
          >
            {ad.city}
          </p>
        )}
      </div>
    </article>
  );
}
