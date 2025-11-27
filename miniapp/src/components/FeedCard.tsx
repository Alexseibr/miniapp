import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Package } from 'lucide-react';
import { FeedItem } from '@/types';
import { getFeedImageUrl, getThumbnailUrl } from '@/constants/placeholders';

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
  const [useFallback, setUseFallback] = useState(false);
  const preloadRef = useRef<HTMLImageElement | null>(null);

  const images = item.images?.length ? item.images : item.photos || [];
  const rawMainImage = item.previewUrl || images[0];
  const optimizedUrl = rawMainImage ? getFeedImageUrl(rawMainImage) : '';
  const fallbackUrl = rawMainImage || '';
  const mainImage = useFallback ? fallbackUrl : optimizedUrl;
  const hasImage = !!rawMainImage && !imageError;

  useEffect(() => {
    if (nextImageUrl && isActive) {
      const img = new Image();
      img.src = getThumbnailUrl(nextImageUrl);
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
    setUseFallback(false);
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
    if (!useFallback && rawMainImage) {
      setUseFallback(true);
      setImageLoaded(false);
    } else {
      setImageError(true);
      setImageLoaded(true);
    }
  }, [useFallback, rawMainImage]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    const km = meters / 1000;
    return `${km.toFixed(1).replace('.', ',')} км`;
  };

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('ru-RU')} руб.`;
  };

  const location = item.district
    ? `${item.city} (${item.district})`
    : item.city || 'Беларусь';

  const description = item.description
    ? item.description.length > 80
      ? item.description.substring(0, 80) + '...'
      : item.description
    : '';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '12px 16px 24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={handleCardClick}
        data-testid={`feed-card-${item._id}`}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#FFFFFF',
          cursor: 'pointer',
          overflow: 'hidden',
          touchAction: 'pan-y',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Title at top */}
        <div
          style={{
            padding: '14px 16px 10px',
            background: '#FFFFFF',
            flexShrink: 0,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: '#1F2937',
              lineHeight: 1.3,
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

        {/* Photo container */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            background: '#F5F6F8',
            overflow: 'hidden',
          }}
        >
          {/* Loading skeleton - only show when we have an image to load */}
          {hasImage && !imageLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={32} color="#C0C0C0" strokeWidth={1.5} />
              </div>
            </div>
          )}

          {/* Main photo */}
          {hasImage ? (
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
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#F5F6F8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
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
                  fontSize: 15,
                  color: '#9CA3AF',
                  fontWeight: 500,
                }}
              >
                Нет фото
              </span>
            </div>
          )}

        </div>

        {/* Bottom section: Price + Like, Description, Location */}
        <div
          style={{
            padding: '12px 16px',
            background: '#FFFFFF',
            flexShrink: 0,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        >
          {/* Price row with like */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#3A7BFF',
                letterSpacing: '-0.5px',
              }}
              data-testid="text-price"
            >
              {formatPrice(item.price)}
            </span>
            
            <button
              onClick={handleLike}
              data-testid="button-like"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: 'none',
                background: isLiked
                  ? 'linear-gradient(135deg, #FF6B6B, #EE5A5A)'
                  : '#F5F6F8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isLiked ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isLiked ? '0 4px 16px rgba(255, 107, 107, 0.35)' : 'none',
              }}
            >
              <Heart
                size={22}
                fill={isLiked ? '#fff' : 'none'}
                color={isLiked ? '#fff' : '#9CA3AF'}
                strokeWidth={isLiked ? 0 : 2}
              />
            </button>
          </div>

          {/* Description */}
          {description && (
            <p
              style={{
                margin: '0 0 10px',
                fontSize: 14,
                lineHeight: 1.4,
                color: '#6B7280',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              data-testid="text-description"
            >
              {description}
            </p>
          )}

          {/* Location + Distance */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <MapPin size={16} color="#3A7BFF" />
            <span
              style={{
                fontSize: 14,
                color: '#6B7280',
              }}
              data-testid="text-location"
            >
              {location}
            </span>
            {item.distanceMeters > 0 && (
              <>
                <span style={{ fontSize: 14, color: '#D1D5DB' }}>·</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#3A7BFF',
                  }}
                  data-testid="text-distance"
                >
                  {formatDistance(item.distanceMeters)}
                </span>
              </>
            )}
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
