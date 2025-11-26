import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Truck, MapPin, Package } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { PriceBadgeChip } from './pricing';
import { AdPreview, PriceBadgeData } from '@/types';
import { formatCityDistance } from '@/utils/geo';
import { formatRelativeTime } from '@/utils/time';
import { useCartStore } from '@/store/cart';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import { generateSrcSet, generateAdCardSizes } from '@/utils/imageOptimization';
import { trackImpression } from '@/api/ads';

interface AdCardProps {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
  showActions?: boolean;
  priceBrief?: PriceBadgeData | null;
}

const NO_PHOTO_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%230A0F1A'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-size='16' font-family='Inter, sans-serif'>Нет фото</text></svg>";

export default function AdCard({ ad, onSelect, showActions = true, priceBrief }: AdCardProps) {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  
  const photos = ad.photos && ad.photos.length > 0 ? ad.photos : [NO_PHOTO_PLACEHOLDER];

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
        background: 'rgba(10, 15, 26, 0.8)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Image Container */}
      <div 
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          background: '#0A0F1A',
          overflow: 'hidden',
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
                      background: '#0A0F1A',
                    }}
                    onClick={handleCardClick}
                  >
                    <Package size={32} color="#64748B" />
                  </div>
                )}
              </SwiperSlide>
            );
          })}
        </Swiper>
        
        {/* Favorite Button */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}>
          <FavoriteButton adId={ad._id} />
        </div>
        
        {/* Photo Counter */}
        {photos.length > 1 && (
          <div 
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(10, 15, 26, 0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              color: '#94A3B8',
              fontFamily: 'var(--font-mono)',
            }}
            data-testid={`photo-counter-${ad._id}`}
          >
            {currentPhotoIndex + 1}/{photos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        {/* Price Row */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p
              data-testid={`ad-price-${ad._id}`}
              style={{ 
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: isFree ? '#10B981' : '#3B82F6',
                fontFamily: 'var(--font-mono)',
                textShadow: isFree 
                  ? '0 0 10px rgba(16, 185, 129, 0.4)' 
                  : '0 0 10px rgba(59, 130, 246, 0.4)',
              }}
            >
              {isFree ? 'ДАРОМ' : `${ad.price.toLocaleString('ru-RU')} ${ad.currency || 'BYN'}`}
            </p>
            {(priceBrief || ad.priceBadge) && (
              <PriceBadgeChip 
                badge={priceBrief || ad.priceBadge} 
                size="small" 
              />
            )}
          </div>
          {ad.createdAt && (
            <span
              data-testid={`ad-date-${ad._id}`}
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: '#64748B',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                padding: '3px 8px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {formatRelativeTime(new Date(ad.createdAt))}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          data-testid={`ad-title-${ad._id}`}
          style={{
            margin: '0 0 6px',
            fontSize: 14,
            fontWeight: 600,
            color: '#F8FAFC',
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
        {(ad.city || ad.distanceKm != null) && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5,
            }}
          >
            <MapPin 
              size={12} 
              style={{ 
                color: ad.distanceKm != null ? '#10B981' : '#64748B', 
                flexShrink: 0,
                filter: ad.distanceKm != null ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' : 'none',
              }} 
            />
            <p
              data-testid={`ad-location-${ad._id}`}
              style={{ 
                margin: 0,
                fontSize: 12,
                color: '#64748B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatCityDistance(ad.city, ad.distanceKm)}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
