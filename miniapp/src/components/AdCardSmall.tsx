import { useNavigate } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { AdPreview } from '@/types';
import { formatDistance } from '@/utils/geo';
import { PriceBadgeChip } from './pricing';
import { NO_PHOTO_PLACEHOLDER, getPhotoUrl } from '@/constants/placeholders';

interface AdCardSmallProps {
  ad: AdPreview;
  onSelect?: (ad: AdPreview) => void;
}

export default function AdCardSmall({ ad, onSelect }: AdCardSmallProps) {
  const navigate = useNavigate();
  
  const photo = ad.photos && ad.photos.length > 0 ? getPhotoUrl(ad.photos[0]) : NO_PHOTO_PLACEHOLDER;
  const distanceLabel = formatDistance(ad.distanceKm);

  const handleClick = () => {
    if (onSelect) {
      onSelect(ad);
    } else {
      navigate(`/ads/${ad._id}`);
    }
  };

  return (
    <article
      onClick={handleClick}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      className="ad-card-small"
      data-testid={`ad-card-small-${ad._id}`}
    >
      <div
        style={{
          position: 'relative',
          paddingTop: '75%',
          background: '#f1f5f9',
        }}
      >
        <img
          src={photo}
          alt={ad.title}
          loading="lazy"
          decoding="async"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        {ad.photos && ad.photos.length > 1 && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
            }}
          >
            {ad.photos.length} фото
          </div>
        )}
        {ad.favoritesCount != null && ad.favoritesCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.9)',
              padding: '3px 6px',
              borderRadius: 6,
            }}
          >
            <Heart size={12} fill="#ef4444" color="#ef4444" />
            <span style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>
              {ad.favoritesCount}
            </span>
          </div>
        )}
      </div>
      
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#111827',
            }}
            data-testid={`ad-price-small-${ad._id}`}
          >
            {ad.price.toLocaleString('ru-RU')} руб.
          </p>
          {ad.priceBadge && <PriceBadgeChip badge={ad.priceBadge} size="small" />}
        </div>
        
        <h3
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            fontWeight: 500,
            color: '#374151',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: '2.6em',
          }}
          data-testid={`ad-title-small-${ad._id}`}
        >
          {ad.title}
        </h3>
        
        {distanceLabel && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 8,
            }}
          >
            <MapPin
              size={12}
              style={{ color: '#10b981', flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 12,
                color: '#6B7280',
              }}
              data-testid={`ad-distance-small-${ad._id}`}
            >
              {distanceLabel}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
