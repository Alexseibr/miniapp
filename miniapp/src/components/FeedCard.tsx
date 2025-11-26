import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, X, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { FeedItem } from '@/types';

interface FeedCardProps {
  item: FeedItem;
  onLike: () => void;
  onDislike: () => void;
  onViewOpen: () => void;
  showSwipeHints?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function FeedCard({
  item,
  onLike,
  onDislike,
  onViewOpen,
  showSwipeHints = false,
  isFirst = false,
  isLast = false,
}: FeedCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      setDisliked(false);
      onLike();
    }
  }, [liked, onLike]);

  const handleDislike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disliked) {
      setDisliked(true);
      setLiked(false);
      onDislike();
    }
  }, [disliked, onDislike]);

  const handleCardClick = useCallback(() => {
    onViewOpen();
    navigate(`/ads/${item._id}`);
  }, [item._id, navigate, onViewOpen]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    }
    return `${(meters / 1000).toFixed(1)} км`;
  };

  const formatPrice = (price: number, currency: string): string => {
    return `${price.toLocaleString('ru-RU')} ${currency}`;
  };

  const mainImage = item.images?.[0] || '';
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
      {!imageLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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

      {mainImage && (
        <img
          src={mainImage}
          alt={item.title}
          onLoad={() => setImageLoaded(true)}
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
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />

      {showSwipeHints && !isFirst && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            opacity: 0.7,
          }}
        >
          <ChevronUp size={16} />
          <span>Свайп вверх — назад</span>
        </div>
      )}

      {showSwipeHints && !isLast && (
        <div
          style={{
            position: 'absolute',
            bottom: 180,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            opacity: 0.7,
          }}
        >
          <ChevronDown size={16} />
          <span>Свайп вниз — далее</span>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          right: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleLike}
          data-testid="button-like"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: liked
              ? 'linear-gradient(135deg, #FF6B6B, #EE5A5A)'
              : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: liked ? 'scale(1.1)' : 'scale(1)',
            boxShadow: liked ? '0 4px 20px rgba(255, 107, 107, 0.4)' : 'none',
          }}
        >
          <Heart
            size={28}
            fill={liked ? '#fff' : 'none'}
            color="#fff"
            strokeWidth={liked ? 0 : 2}
          />
        </button>

        <button
          onClick={handleDislike}
          data-testid="button-dislike"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: disliked
              ? 'rgba(100,100,100,0.9)'
              : 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: disliked ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          <X size={28} color="#fff" strokeWidth={2} />
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 16px calc(env(safe-area-inset-bottom) + 80px)',
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'rgba(58, 123, 255, 0.9)',
            borderRadius: 20,
            marginBottom: 12,
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

        <h2
          style={{
            margin: '0 0 12px',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.3,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          data-testid="text-title"
        >
          {item.title}
        </h2>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            width: 'fit-content',
          }}
        >
          <MapPin size={18} color="#3A7BFF" />
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
            }}
            data-testid="text-location"
          >
            {location}
          </span>
          {item.distanceMeters > 0 && (
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
                marginLeft: 4,
              }}
              data-testid="text-distance"
            >
              · {formatDistance(item.distanceMeters)}
            </span>
          )}
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
