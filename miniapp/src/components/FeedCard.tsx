import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Package } from 'lucide-react';
import { FeedItem } from '@/types';
import { getPhotoUrl } from '@/constants/placeholders';
import PhotoCarousel from './PhotoCarousel';

interface FeedCardProps {
  item: FeedItem;
  onLike: (adId: string) => void;
  onViewOpen: () => void;
  isActive?: boolean;
  nextImageUrl?: string;
  isLiked?: boolean;
}

export default function FeedCard({
  item,
  onLike,
  onViewOpen,
  isActive = true,
  nextImageUrl,
  isLiked = false,
}: FeedCardProps) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const preloadRef = useRef<HTMLImageElement | null>(null);

  const images = item.images?.length ? item.images : item.photos || [];
  const hasMultipleImages = images.length > 1;
  const rawMainImage = images[0];
  const mainImage = rawMainImage ? getPhotoUrl(rawMainImage) : '';
  const hasImage = !!rawMainImage && !imageError;

  useEffect(() => {
    if (nextImageUrl && isActive) {
      const img = new Image();
      img.src = getPhotoUrl(nextImageUrl);
      preloadRef.current = img;
    }
    return () => {
      if (preloadRef.current) {
        preloadRef.current = null;
      }
    };
  }, [nextImageUrl, isActive]);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [item._id]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      onLike(item._id);
    }
  }, [isLiked, onLike, item._id]);

  const handleCardClick = useCallback(() => {
    onViewOpen();
    navigate(`/ads/${item._id}`);
  }, [item._id, navigate, onViewOpen]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1).replace('.', ',')} км`;
  };

  const formatPrice = (price: number, currency: string): string => {
    return `${price.toLocaleString('ru-RU')} ${currency}`;
  };

  const location = item.district
    ? `${item.city} (${item.district})`
    : item.city || 'Беларусь';

  return (
    <div
      onClick={handleCardClick}
      data-testid={`feed-card-${item._id}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        cursor: 'pointer',
        overflow: 'hidden',
        touchAction: 'pan-y',
      }}
    >
      {/* Loading spinner */}
      {!imageLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '3px solid rgba(58, 123, 255, 0.3)',
              borderTopColor: '#3A7BFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {/* Photo content */}
      {hasImage ? (
        hasMultipleImages ? (
          <PhotoCarousel
            images={images.map(img => getPhotoUrl(img))}
            title={item.title}
            onImageLoad={handleImageLoad}
            onImageError={handleImageError}
            isActive={isActive}
          />
        ) : (
          <img
            src={mainImage}
            alt={item.title}
            loading={isActive ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        )
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #F5F6F8 0%, #E5E7EB 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 100,
              height: 80,
              borderRadius: 12,
              background: '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={40} color="#9CA3AF" strokeWidth={1.5} />
          </div>
          <span
            style={{
              fontSize: 16,
              color: '#9CA3AF',
              fontWeight: 500,
            }}
          >
            Нет фото
          </span>
        </div>
      )}

      {/* Gradient overlays */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: hasImage 
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.85) 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* Title at top center */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 16,
          right: 16,
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          data-testid="text-title"
        >
          {item.title}
        </h2>
      </div>

      {/* Bottom bar: location left, price+like right */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 16px calc(env(safe-area-inset-bottom) + 80px)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        {/* Location left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            maxWidth: '55%',
          }}
        >
          <MapPin size={16} color="#3A7BFF" />
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            data-testid="text-location"
          >
            {location}
          </span>
          {item.distanceMeters > 0 && (
            <>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>·</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                }}
                data-testid="text-distance"
              >
                {formatDistance(item.distanceMeters)}
              </span>
            </>
          )}
        </div>

        {/* Price + Like right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              background: 'rgba(58, 123, 255, 0.95)',
              borderRadius: 12,
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.5px',
              }}
              data-testid="text-price"
            >
              {formatPrice(item.price, item.currency)}
            </span>
          </div>
          
          <button
            onClick={handleLike}
            data-testid="button-like"
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: 'none',
              background: isLiked
                ? 'linear-gradient(135deg, #FF6B6B, #EE5A5A)'
                : 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: isLiked ? 'scale(1.1)' : 'scale(1)',
              boxShadow: isLiked ? '0 4px 20px rgba(255, 107, 107, 0.4)' : 'none',
            }}
          >
            <Heart
              size={24}
              fill={isLiked ? '#fff' : 'none'}
              color="#fff"
              strokeWidth={isLiked ? 0 : 2}
            />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
