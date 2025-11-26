import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Package } from 'lucide-react';
import FavoriteButton from './FavoriteButton';
import { PriceBadgeChip } from './pricing';
import { AdPreview, PriceBadgeData } from '@/types';
import { formatCityDistance } from '@/utils/geo';
import { formatRelativeTime } from '@/utils/time';
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
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23F5F6F8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='16' font-family='Inter, sans-serif'>Нет фото</text></svg>";

export default function AdCard({ ad, onSelect, showActions = true, priceBrief }: AdCardProps) {
  const navigate = useNavigate();
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

  const isFree = ad.price === 0;
  const isFresh = ad.createdAt && 
    (Date.now() - new Date(ad.createdAt).getTime()) < 48 * 60 * 60 * 1000;

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
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Image Container */}
      <div 
        style={{
          position: 'relative',
          aspectRatio: '1',
          background: '#F5F6F8',
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

        {/* Fresh Badge */}
        {isFresh && !isFree && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#22C55E',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
            zIndex: 10,
          }}>
            Свежее
          </div>
        )}

        {/* Free Badge */}
        {isFree && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: '#EC4899',
            color: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
            zIndex: 10,
          }}>
            Даром
          </div>
        )}
        
        {/* Favorite Button */}
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}>
          <div style={{
            width: 32,
            height: 32,
            background: '#FFFFFF',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}>
            <FavoriteButton adId={ad._id} />
          </div>
        </div>
        
        {/* Photo Counter */}
        {photos.length > 1 && (
          <div 
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
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
      <div style={{ padding: 12 }}>
        {/* Price Row */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 8, 
          marginBottom: 6,
        }}>
          <p
            data-testid={`ad-price-${ad._id}`}
            style={{ 
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#1F2937',
            }}
          >
            {isFree ? 'Даром' : `₽${ad.price.toLocaleString('ru-RU')}`}
          </p>
          {(priceBrief || ad.priceBadge) && (
            <PriceBadgeChip 
              badge={priceBrief || ad.priceBadge} 
              size="small" 
            />
          )}
        </div>

        {/* Title */}
        <h3
          data-testid={`ad-title-${ad._id}`}
          style={{
            margin: '0 0 6px',
            fontSize: 14,
            fontWeight: 500,
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
        {(ad.city || ad.distanceKm != null) && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
            }}
          >
            <MapPin size={12} color="#9CA3AF" />
            <p
              data-testid={`ad-location-${ad._id}`}
              style={{ 
                margin: 0,
                fontSize: 12,
                color: '#9CA3AF',
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
